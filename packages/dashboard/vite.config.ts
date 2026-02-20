import react from "@vitejs/plugin-react";
import UnoCSS from "unocss/vite";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [react(), UnoCSS()],
	build: {
		outDir: "../../dist",
		emptyOutDir: true,
	},
	server: {
		proxy: {
			"/api": {
				target: "http://localhost:8787",
				changeOrigin: true,
			},
			// リダイレクトのプレビュー用（/:id）
			// ただし、/admin, /assets は除外
		},
	},
});
