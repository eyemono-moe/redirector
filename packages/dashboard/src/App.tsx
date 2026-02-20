import { RedirectToSignIn, SignedIn, SignedOut } from "@clerk/clerk-react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard";

export default function App() {
	return (
		<BrowserRouter basename="/admin">
			<Routes>
				<Route
					path="/"
					element={
						<>
							<SignedIn>
								<Dashboard />
							</SignedIn>
							<SignedOut>
								<RedirectToSignIn />
							</SignedOut>
						</>
					}
				/>
			</Routes>
		</BrowserRouter>
	);
}
