import { env } from "cloudflare:workers";
import type { Context } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import app from "../src/index";

// Clerk認証のモック
vi.mock("@hono/clerk-auth", () => ({
	// biome-ignore lint/suspicious/noExplicitAny: Mock function requires flexible parameter types
	clerkMiddleware: () => async (_: any, next: any) => {
		// 認証ミドルウェアは何もせずに次に進む
		await next();
	},
	getAuth: (c: Context) => {
		// リクエストヘッダーからモック用のuserIdを取得
		const userId = c.req.header("X-Test-User-Id");
		return userId ? { userId } : { userId: null };
	},
}));

// Clerk backendのモック
vi.mock("@clerk/backend", () => ({
	createClerkClient: () => ({
		users: {
			getUser: async (userId: string) => {
				// テスト用のユーザー情報を返す
				if (userId === "allowed-user") {
					return {
						emailAddresses: [{ emailAddress: "admin@example.com" }],
					};
				}
				if (userId === "forbidden-user") {
					return {
						emailAddresses: [{ emailAddress: "notallowed@example.com" }],
					};
				}
				throw new Error("User not found");
			},
		},
	}),
}));

describe("Admin API", () => {
	beforeEach(async () => {
		// テストごとにKVをクリーンアップ
		const keys = await env.REDIRECTS.list();
		await Promise.all(keys.keys.map((key) => env.REDIRECTS.delete(key.name)));
	});

	// テスト用の環境変数を含むenvオブジェクトを作成
	const testEnv = {
		...env,
		ALLOWED_EMAILS: "admin@example.com",
		CLERK_SECRET_KEY: "test-secret-key",
		CLERK_PUBLISHABLE_KEY: "test-publishable-key",
	};

	describe("GET /api/redirects", () => {
		it("should return empty array when no redirects exist", async () => {
			const res = await app.request(
				"http://localhost/api/redirects",
				{
					headers: { "X-Test-User-Id": "allowed-user" },
				},
				testEnv,
			);

			expect(res.status).toBe(200);
			const data = await res.json();
			expect(data).toEqual([]);
		});

		it("should return all redirects", async () => {
			await env.REDIRECTS.put("id1", "https://example1.com");
			await env.REDIRECTS.put("id2", "https://example2.com");

			const res = await app.request(
				"http://localhost/api/redirects",
				{
					headers: { "X-Test-User-Id": "allowed-user" },
				},
				testEnv,
			);

			expect(res.status).toBe(200);
			const data = await res.json();
			expect(data).toHaveLength(2);
			expect(data).toEqual(
				expect.arrayContaining([
					{ id: "id1", destination: "https://example1.com" },
					{ id: "id2", destination: "https://example2.com" },
				]),
			);
		});

		it("should return 401 when not authenticated", async () => {
			const res = await app.request(
				"http://localhost/api/redirects",
				{},
				testEnv,
			);

			expect(res.status).toBe(401);
			const data = (await res.json()) as { error: string };
			expect(data.error).toBe("Unauthorized: Not authenticated");
		});

		it("should return 403 when email is not allowed", async () => {
			const res = await app.request(
				"http://localhost/api/redirects",
				{
					headers: { "X-Test-User-Id": "forbidden-user" },
				},
				testEnv,
			);

			expect(res.status).toBe(403);
			const data = (await res.json()) as { error: string };
			expect(data.error).toBe("Unauthorized: Email not in allowed list");
		});
	});

	describe("POST /api/redirects/:id", () => {
		it("should create a new redirect", async () => {
			const res = await app.request(
				"http://localhost/api/redirects/new-id",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-Test-User-Id": "allowed-user",
					},
					body: JSON.stringify({ destination: "https://example.com" }),
				},
				testEnv,
			);

			expect(res.status).toBe(200);
			const data = await res.json();
			expect(data).toEqual({
				id: "new-id",
				destination: "https://example.com",
			});

			// KVに保存されたことを確認
			const stored = await env.REDIRECTS.get("new-id");
			expect(stored).toBe("https://example.com");
		});

		it("should return 409 when ID already exists", async () => {
			await env.REDIRECTS.put("existing-id", "https://example.com");

			const res = await app.request(
				"http://localhost/api/redirects/existing-id",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-Test-User-Id": "allowed-user",
					},
					body: JSON.stringify({ destination: "https://newurl.com" }),
				},
				testEnv,
			);

			expect(res.status).toBe(409);
			const data = (await res.json()) as { error: string };
			expect(data.error).toBe("Conflict: Redirect ID already exists");
		});

		it("should reject invalid URL protocol", async () => {
			const res = await app.request(
				"http://localhost/api/redirects/test-id",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-Test-User-Id": "allowed-user",
					},
					body: JSON.stringify({ destination: "ftp://example.com" }),
				},
				testEnv,
			);

			expect(res.status).toBe(400);
		});

		it("should reject invalid ID format", async () => {
			const res = await app.request(
				"http://localhost/api/redirects/invalid id!",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-Test-User-Id": "allowed-user",
					},
					body: JSON.stringify({ destination: "https://example.com" }),
				},
				testEnv,
			);

			expect(res.status).toBe(400);
		});
	});

	describe("PUT /api/redirects/:id", () => {
		it("should update an existing redirect", async () => {
			await env.REDIRECTS.put("test-id", "https://old-url.com");

			const res = await app.request(
				"http://localhost/api/redirects/test-id",
				{
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						"X-Test-User-Id": "allowed-user",
					},
					body: JSON.stringify({ destination: "https://new-url.com" }),
				},
				testEnv,
			);

			expect(res.status).toBe(200);
			const data = await res.json();
			expect(data).toEqual({
				id: "test-id",
				destination: "https://new-url.com",
			});

			// KVが更新されたことを確認
			const stored = await env.REDIRECTS.get("test-id");
			expect(stored).toBe("https://new-url.com");
		});

		it("should return 404 when ID does not exist", async () => {
			const res = await app.request(
				"http://localhost/api/redirects/nonexistent",
				{
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						"X-Test-User-Id": "allowed-user",
					},
					body: JSON.stringify({ destination: "https://example.com" }),
				},
				testEnv,
			);

			expect(res.status).toBe(404);
			const data = (await res.json()) as { error: string };
			expect(data.error).toBe("Not Found: Redirect ID does not exist");
		});
	});

	describe("DELETE /api/redirects/:id", () => {
		it("should delete a redirect", async () => {
			await env.REDIRECTS.put("test-id", "https://example.com");

			const res = await app.request(
				"http://localhost/api/redirects/test-id",
				{
					method: "DELETE",
					headers: { "X-Test-User-Id": "allowed-user" },
				},
				testEnv,
			);

			expect(res.status).toBe(200);
			const data = await res.json();
			expect(data).toEqual({ deleted: "test-id" });

			// KVから削除されたことを確認
			const stored = await env.REDIRECTS.get("test-id");
			expect(stored).toBeNull();
		});

		it("should return 200 even when ID does not exist", async () => {
			const res = await app.request(
				"http://localhost/api/redirects/nonexistent",
				{
					method: "DELETE",
					headers: { "X-Test-User-Id": "allowed-user" },
				},
				testEnv,
			);

			expect(res.status).toBe(200);
			const data = await res.json();
			expect(data).toEqual({ deleted: "nonexistent" });
		});
	});
});
