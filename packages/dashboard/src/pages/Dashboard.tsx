import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { valibotValidator } from "@tanstack/valibot-form-adapter";
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
		validatorAdapter: valibotValidator(),
		validators: {
			onChange: CreateRedirectFormSchema,
		},
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
		<div className="p-8 max-w-800px mx-auto">
			<h1 className="text-3xl font-bold mb-6">Redirects Management</h1>

			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
				className="mb-8 p-4 border border-gray-300 rounded-lg"
			>
				<h2 className="text-2xl font-semibold mb-4">Create New Redirect</h2>

				<form.Field
					name="id"
					validators={{
						onChange: RedirectIdSchema,
					}}
				>
					{(field) => (
						<div className="mb-4">
							<label className="block">
								<span className="text-sm font-medium">
									ID (alphanumeric, hyphen, underscore):
								</span>
								<input
									type="text"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									className="ml-2 px-2 py-1 border border-gray-300 rounded"
								/>
							</label>
							{field.state.meta.errors.length > 0 && (
								<div className="text-red-500 text-sm mt-1">
									{String(field.state.meta.errors[0])}
								</div>
							)}
						</div>
					)}
				</form.Field>

				<form.Field
					name="destination"
					validators={{
						onChange: DestinationUrlSchema,
					}}
				>
					{(field) => (
						<div className="mb-4">
							<label className="block">
								<span className="text-sm font-medium">Destination URL:</span>
								<input
									type="url"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									className="ml-2 px-2 py-1 border border-gray-300 rounded w-300px"
								/>
							</label>
							{field.state.meta.errors.length > 0 && (
								<div className="text-red-500 text-sm mt-1">
									{String(field.state.meta.errors[0])}
								</div>
							)}
						</div>
					)}
				</form.Field>

				<button
					type="submit"
					disabled={createMutation.isPending}
					className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{createMutation.isPending ? "Creating..." : "Create"}
				</button>
			</form>

			<h2 className="text-2xl font-semibold mb-4">Existing Redirects</h2>
			{redirects.length === 0 ? (
				<p className="text-gray-600">No redirects found.</p>
			) : (
				<ul className="space-y-2">
					{redirects.map((r) => (
						<li
							key={r.id}
							className="p-3 border border-gray-300 rounded-lg flex items-center justify-between"
						>
							<span>
								<strong className="font-mono">{document.location.origin}/r/{r.id}</strong> → {r.destination}
							</span>
							<button
								type="button"
								onClick={() => handleDelete(r.id)}
								disabled={deleteMutation.isPending}
								className="ml-4 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Delete
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
