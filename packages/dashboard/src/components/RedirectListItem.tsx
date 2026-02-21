import { revalidateLogic, useForm } from "@tanstack/react-form";
import { useState } from "react";
import { DestinationUrlSchema, type Redirect } from "shared/schemas";
import * as v from "valibot";

interface RedirectListItemProps {
	redirect: Redirect;
	onUpdate: (id: string, destination: string) => Promise<void>;
	onDelete: (id: string) => Promise<void>;
	isUpdating: boolean;
	isDeleting: boolean;
	disabled?: boolean;
}

const UpdateRedirectFormSchema = v.object({
	destination: DestinationUrlSchema,
});

export function RedirectListItem({
	redirect,
	onUpdate,
	onDelete,
	isUpdating,
	isDeleting,
	disabled = false,
}: RedirectListItemProps) {
	const [isEditing, setIsEditing] = useState(false);

	const form = useForm({
		defaultValues: {
			destination: redirect.destination,
		},
		validationLogic: revalidateLogic(),
		validators: { onDynamic: UpdateRedirectFormSchema },
		onSubmit: async ({ value }) => {
			await onUpdate(redirect.id, value.destination);
			setIsEditing(false);
		},
	});

	const handleCancelEdit = () => {
		form.reset();
		setIsEditing(false);
	};

	const handleDelete = async () => {
		if (!confirm(`Delete redirect "${redirect.id}"?`)) return;
		await onDelete(redirect.id);
	};

	const shortUrl = `${document.location.origin}/r/${redirect.id}`;

	return (
		<li className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
			<div className="flex flex-col gap-3">
				<div className="flex items-start gap-2">
					<div className="flex-1 min-w-0">
						<div className="text-xs text-gray-500 mb-1">Short URL</div>
						<div className="font-mono text-sm text-blue-600 font-medium break-all">
							{shortUrl}
						</div>
					</div>
					<button
						type="button"
						onClick={() => {
							navigator.clipboard.writeText(shortUrl);
						}}
						className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors flex-shrink-0"
						title="Copy URL"
					>
						Copy
					</button>
				</div>

				<div className="flex items-start gap-2">
					<div className="flex-1 min-w-0">
						<div className="text-xs text-gray-500 mb-1">Destination</div>
						{isEditing ? (
							<form
								onSubmit={(e) => {
									e.preventDefault();
									e.stopPropagation();
									form.handleSubmit();
								}}
							>
								<form.Field name="destination">
									{(field) => (
										<div>
											<input
												type="text"
												value={field.state.value}
												onChange={(e) => field.handleChange(e.target.value)}
												onBlur={field.handleBlur}
												placeholder="https://example.com"
												className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
											/>
											{field.state.meta.errors.length > 0 && (
												<div className="text-red-500 text-xs mt-1">
													{field.state.meta.errors.map((err) => (
														<div key={err?.message}>{err?.message}</div>
													))}
												</div>
											)}
										</div>
									)}
								</form.Field>
							</form>
						) : (
							<div className="text-sm text-gray-700 break-all">
								{redirect.destination}
							</div>
						)}
					</div>
					{!isEditing && (
						<button
							type="button"
							onClick={() => {
								navigator.clipboard.writeText(redirect.destination);
							}}
							className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors flex-shrink-0"
							title="Copy destination URL"
						>
							Copy
						</button>
					)}
				</div>
			</div>

			<div className="flex justify-end gap-2 mt-3 pt-3 border-t border-gray-200">
				{isEditing ? (
					<>
						<button
							type="button"
							onClick={handleCancelEdit}
							disabled={isUpdating}
							className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
						>
							Cancel
						</button>
						<form.Subscribe
							selector={(state) => [state.canSubmit, state.isSubmitting]}
						>
							{([canSubmit, isSubmitting]) => (
								<button
									type="button"
									onClick={() => form.handleSubmit()}
									disabled={!canSubmit || isUpdating}
									className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
								>
									{isUpdating || isSubmitting ? "Saving..." : "Save"}
								</button>
							)}
						</form.Subscribe>
					</>
				) : (
					<>
						<button
							type="button"
							onClick={() => setIsEditing(true)}
							disabled={disabled || isDeleting}
							className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
						>
							Edit
						</button>
						<button
							type="button"
							onClick={handleDelete}
							disabled={disabled || isDeleting}
							className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
						>
							Delete
						</button>
					</>
				)}
			</div>
		</li>
	);
}
