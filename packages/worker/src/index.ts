import { createClerkClient } from "@clerk/backend";
import type { Fetcher, KVNamespace } from "@cloudflare/workers-types";
import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import { sValidator } from "@hono/standard-validator";
import { Hono } from "hono";
import { createFactory } from "hono/factory";
import { logger } from "hono/logger";
import {
	CreateRedirectSchema,
	type Redirect,
	RedirectIdSchema,
} from "shared/schemas";
import * as v from "valibot";

type Bindings = {
	REDIRECTS: KVNamespace;
	CLERK_PUBLISHABLE_KEY: string;
	CLERK_SECRET_KEY: string;
	ALLOWED_EMAILS: string;
	ASSETS: Fetcher;
};

const app = new Hono<{ Bindings: Bindings }>();

// ─── Clerk middleware (全体に適用、検証は必要なルートのみ) ───────────────────
app.use("*", logger());
app.use("*", clerkMiddleware());

// ─── リダイレクト /:id ───────────────────────────────────────────────────
app.get("/r/:id", async (c) => {
	const id = c.req.param("id");

	// admin は管理画面へ（静的アセットに処理を委譲）
	if (id === "admin") {
		return c.env.ASSETS.fetch(c.req.raw);
	}

	const destination = await c.env.REDIRECTS.get(id);

	if (!destination) {
		return c.text("Not Found", 404);
	}

	return c.redirect(destination, 302);
});

// ─── 管理 API（Clerk JWT 検証） ──────────────────────────────────────────

// 認証チェックミドルウェア
const factory = createFactory<{ Bindings: Bindings }>();
const requireAuth = factory.createMiddleware(async (c, next) => {
	const auth = getAuth(c);

	if (!auth?.userId) {
		return c.json({ error: "Unauthorized: Not authenticated" }, 401);
	}

	// 許可されたメールアドレスのリストを環境変数から取得（カンマ区切り）
	const allowedEmailsStr = c.env.ALLOWED_EMAILS || "";
	const allowedEmails = allowedEmailsStr
		.split(",")
		.map((email: string) => email.trim())
		.filter((email: string) => email.length > 0);

	if (allowedEmails.length === 0) {
		return c.json({ error: "Unauthorized: No allowed emails configured" }, 500);
	}

	// Clerkクライアントを作成してユーザー情報を取得
	const clerkClient = createClerkClient({
		secretKey: c.env.CLERK_SECRET_KEY,
	});

	try {
		const user = await clerkClient.users.getUser(auth.userId);

		// ユーザーのメールアドレスをチェック
		const userEmails = user.emailAddresses.map((e) => e.emailAddress);
		const hasAllowedEmail = userEmails.some((email) =>
			allowedEmails.includes(email),
		);

		if (!hasAllowedEmail) {
			return c.json(
				{
					error: "Unauthorized: Email not in allowed list",
				},
				403,
			);
		}

		await next();
	} catch (error) {
		console.error("Failed to verify user:", error);
		return c.json({ error: "Unauthorized: Failed to verify user" }, 500);
	}
});

// 全リダイレクト一覧取得
app.get("/api/redirects", requireAuth, async (c) => {
	const list = await c.env.REDIRECTS.list();

	const entries: Redirect[] = await Promise.all(
		list.keys.map(async ({ name }) => ({
			id: name,
			destination: (await c.env.REDIRECTS.get(name)) || "",
		})),
	);

	return c.json(entries);
});

// リダイレクト作成・更新（Valibot バリデーション付き）
app.put(
	"/api/redirects/:id",
	requireAuth,
	sValidator("json", CreateRedirectSchema),
	sValidator("param", v.object({ id: RedirectIdSchema })),
	async (c) => {
		const { id } = c.req.valid("param");
		const { destination } = c.req.valid("json");

		await c.env.REDIRECTS.put(id, destination);

		return c.json({ id, destination });
	},
);

// リダイレクト削除
app.delete(
	"/api/redirects/:id",
	requireAuth,
	sValidator("param", v.object({ id: v.string() })),
	async (c) => {
		const { id } = c.req.valid("param");
		await c.env.REDIRECTS.delete(id);
		return c.json({ deleted: id });
	},
);

// ─── ルート ──────────────────────────────────────────────────────────────
app.get("/", (c) => c.redirect("/admin/", 301));

// ─── その他のルートは静的アセットに委譲 ───────────────────────────────────────
app.all("*", (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
