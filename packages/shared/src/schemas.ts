import * as v from "valibot";

// リダイレクトIDのスキーマ
export const RedirectIdSchema = v.pipe(
	v.string("ID is required"),
	v.minLength(1, "ID must not be empty"),
	v.maxLength(100, "ID must be at most 100 characters"),
	v.regex(
		/^[a-zA-Z0-9_-]+$/,
		"ID must contain only alphanumeric characters, hyphens, or underscores",
	),
);

// リダイレクト先URLのスキーマ
export const DestinationUrlSchema = v.pipe(
	v.string("Destination URL is required"),
	v.url("Must be a valid URL"),
	v.custom((url) => {
		try {
			// グローバルなURLコンストラクタを使用（ブラウザ/Workers両対応）
			const parsed = new URL(url);
			return parsed.protocol === "http:" || parsed.protocol === "https:";
		} catch {
			return false;
		}
	}, "URL must use http or https protocol"),
);

// リダイレクト作成/更新リクエストボディのスキーマ
export const CreateRedirectSchema = v.object({
	destination: DestinationUrlSchema,
});

// リダイレクトレスポンスのスキーマ
export const RedirectSchema = v.object({
	id: v.string(),
	destination: v.string(),
});

export const RedirectListSchema = v.array(RedirectSchema);

// 型エクスポート
export type CreateRedirect = v.InferOutput<typeof CreateRedirectSchema>;
export type Redirect = v.InferOutput<typeof RedirectSchema>;
export type RedirectList = v.InferOutput<typeof RedirectListSchema>;
