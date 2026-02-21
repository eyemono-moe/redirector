import type { CreateRedirect, Redirect } from "shared/schemas";

const API_BASE = "/api";

export async function fetchRedirects(): Promise<Redirect[]> {
	const res = await fetch(`${API_BASE}/redirects`);
	if (!res.ok) {
		throw new Error("Failed to fetch redirects");
	}
	return res.json();
}

export async function createRedirect(
	id: string,
	data: CreateRedirect,
): Promise<Redirect> {
	const res = await fetch(`${API_BASE}/redirects/${id}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});

	if (!res.ok) {
		const error = await res.json();
		throw new Error(error.error || "Failed to create redirect");
	}

	return res.json();
}

export async function deleteRedirect(id: string): Promise<void> {
	const res = await fetch(`${API_BASE}/redirects/${id}`, {
		method: "DELETE",
	});

	if (!res.ok) {
		throw new Error("Failed to delete redirect");
	}
}
