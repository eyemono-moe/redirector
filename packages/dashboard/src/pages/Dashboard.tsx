import { UserButton, useUser } from "@clerk/clerk-react";
import { revalidateLogic, useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DestinationUrlSchema, RedirectIdSchema } from "shared/schemas";
import * as v from "valibot";
import {
	createRedirect,
	deleteRedirect,
	fetchRedirects,
} from "../api/redirects";

const CreateRedirectFormSchema = v.object({
	id: RedirectIdSchema,
	destination: DestinationUrlSchema,
});

export default function Dashboard() {
	const { user } = useUser();
	const queryClient = useQueryClient();

	const {
		data: redirects = [],
		isPending,
		error,
	} = useQuery({
		queryKey: ["redirects"],
		queryFn: fetchRedirects,
	});

	const createMutation = useMutation({
		mutationFn: ({ id, destination }: { id: string; destination: string }) =>
			createRedirect(id, { destination }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["redirects"] });
		},
	});

	const deleteMutation = useMutation({
		mutationFn: deleteRedirect,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["redirects"] });
		},
	});

	const form = useForm({
		defaultValues: {
			id: "",
			destination: "",
		},
		validationLogic: revalidateLogic(),
		validators: { onDynamic: CreateRedirectFormSchema },
		onSubmit: async ({ value }) => {
			try {
				await createMutation.mutateAsync(value);
				form.reset();
			} catch (error) {
				console.error("Failed to create redirect:", error);
				alert(
					error instanceof Error ? error.message : "Failed to create redirect",
				);
			}
		},
	});

	const handleDelete = async (id: string) => {
		if (!confirm(`Delete redirect "${id}"?`)) return;
		try {
			await deleteMutation.mutateAsync(id);
		} catch (error) {
			console.error("Failed to delete redirect:", error);
			alert("Failed to delete redirect");
		}
	};

	if (isPending) return <div className="p-8">Loading...</div>;
	if (error) return <div className="p-8">Error: {error.message}</div>;

	return (
		<div className="min-h-screen bg-gray-50">
			<header className="bg-white shadow-sm border-b border-gray-200">
				<div className="max-w-800px mx-auto px-4 py-2 sm:px-8 sm:py-4 flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold text-gray-900">
							Redirects Management
						</h1>
						{user && (
							<p className="text-sm text-gray-600 mt-1">
								Welcome back,{" "}
								{user.fullName || user.emailAddresses[0]?.emailAddress}
							</p>
						)}
					</div>
					<UserButton
						appearance={{
							elements: {
								avatarBox: "w-10 h-10",
							},
						}}
					/>
				</div>
			</header>

			<main className="max-w-800px mx-auto p-4 sm:p-8 space-y-4 sm:space-y-8">
				<section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<h2 className="text-xl font-semibold mb-4 text-gray-900">
						Create New Redirect
					</h2>
					<form
						onSubmit={(e) => {
							e.preventDefault();
							e.stopPropagation();
							form.handleSubmit();
						}}
					>
						<form.Field name="id">
							{(field) => (
								<div className="mb-4">
									<label className="block">
										<span className="text-sm font-medium text-gray-700 mb-1 block">
											ID (alphanumeric, hyphen, underscore)
										</span>
										<input
											type="text"
											value={field.state.value}
											onChange={(e) => field.handleChange(e.target.value)}
											onBlur={field.handleBlur}
											placeholder="my-redirect"
											className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
										/>
									</label>
									{field.state.meta.errors.length > 0 && (
										<div className="text-red-500 text-sm mt-1">
											{field.state.meta.errors.map((err) => (
												<div key={err?.message}>{err?.message}</div>
											))}
										</div>
									)}
								</div>
							)}
						</form.Field>

						<form.Field name="destination">
							{(field) => (
								<div className="mb-6">
									<label className="block">
										<span className="text-sm font-medium text-gray-700 mb-1 block">
											Destination URL
										</span>
										<input
											type="text"
											value={field.state.value}
											onChange={(e) => field.handleChange(e.target.value)}
											onBlur={field.handleBlur}
											placeholder="https://example.com"
											className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
										/>
									</label>
									{field.state.meta.errors.length > 0 && (
										<div className="text-red-500 text-sm mt-1">
											{field.state.meta.errors.map((err) => (
												<div key={err?.message}>{err?.message}</div>
											))}
										</div>
									)}
								</div>
							)}
						</form.Field>
						<form.Subscribe
							selector={(state) => [state.canSubmit, state.isSubmitting]}
						>
							{([canSubmit, isSubmitting]) => (
								<button
									type="submit"
									disabled={!canSubmit}
									className="px-6 py-2 bg-blue-500 text-white rounded-md font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
								>
									{isSubmitting ? "Creating..." : "Create Redirect"}
								</button>
							)}
						</form.Subscribe>
					</form>
				</section>

				<section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<h2 className="text-xl font-semibold mb-4 text-gray-900">
						Existing Redirects ({redirects.length})
					</h2>
					{redirects.length === 0 ? (
						<p className="text-gray-500 text-center py-8">
							No redirects found. Create your first redirect above!
						</p>
					) : (
						<ul className="space-y-3">
							{redirects.map((r) => (
								<li
									key={r.id}
									className="p-4 border border-gray-200 rounded-lg flex items-center justify-between hover:border-gray-300 transition-colors"
								>
									<div className="flex-1 min-w-0">
										<div className="font-mono text-sm text-blue-600 font-medium truncate">
											{document.location.origin}/r/{r.id}
										</div>
										<div className="text-sm text-gray-600 mt-1 truncate">
											→ {r.destination}
										</div>
									</div>
									<button
										type="button"
										onClick={() => handleDelete(r.id)}
										disabled={deleteMutation.isPending}
										className="ml-4 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
									>
										Delete
									</button>
								</li>
							))}
						</ul>
					)}
				</section>
			</main>
		</div>
	);
}
