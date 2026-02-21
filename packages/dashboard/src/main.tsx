import { ClerkProvider } from "@clerk/clerk-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import "virtual:uno.css";
import App from "./App";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60, // 1分
			retry: 1,
		},
	},
});

// biome-ignore lint/style/noNonNullAssertion: div#root exists in index.html
ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<ClerkProvider publishableKey={publishableKey}>
			<QueryClientProvider client={queryClient}>
				<App />
			</QueryClientProvider>
		</ClerkProvider>
	</React.StrictMode>,
);
