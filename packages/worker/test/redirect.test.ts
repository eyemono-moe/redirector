import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../src/index";

describe("Redirect functionality", () => {
	beforeEach(async () => {
		// テストごとにKVをクリーンアップ
		const keys = await env.REDIRECTS.list();
		await Promise.all(keys.keys.map((key) => env.REDIRECTS.delete(key.name)));
	});

	describe("GET /r/:id", () => {
		it("should redirect to the destination URL when ID exists", async () => {
			// テストデータを準備
			await env.REDIRECTS.put("test-id", "https://example.com");

			const res = await app.request("http://localhost/r/test-id", {}, env);

			expect(res.status).toBe(302);
			expect(res.headers.get("Location")).toBe("https://example.com");
		});

		it("should return 404 when ID does not exist", async () => {
			const res = await app.request(
				"http://localhost/r/nonexistent-id",
				{},
				env,
			);

			expect(res.status).toBe(404);
			expect(await res.text()).toBe("Not Found");
		});

		it("should handle special characters in destination URL", async () => {
			const destinationUrl =
				"https://example.com/path?foo=bar&baz=qux#fragment";
			await env.REDIRECTS.put("special", destinationUrl);

			const res = await app.request("http://localhost/r/special", {}, env);

			expect(res.status).toBe(302);
			expect(res.headers.get("Location")).toBe(destinationUrl);
		});

		it("should handle multiple redirects independently", async () => {
			await env.REDIRECTS.put("id1", "https://example1.com");
			await env.REDIRECTS.put("id2", "https://example2.com");

			const res1 = await app.request("http://localhost/r/id1", {}, env);
			const res2 = await app.request("http://localhost/r/id2", {}, env);

			expect(res1.headers.get("Location")).toBe("https://example1.com");
			expect(res2.headers.get("Location")).toBe("https://example2.com");
		});
	});
});
