import { useState } from "react";
import { EditableProduct, Category, User, Product } from "@/lib/types";
import { useProductForm, ProductFormType } from "./hooks/useProductForm";
import EditableCell from "./EditableCell";
import ImageCell from "./ImageCell";
import CategorySelect from "./CategorySelect";
import DepartmentSelect from "./DepartmentSelect";
import ProductActions from "./ProductActions";
import { showErrorToast, showSuccessToast } from "@/components/ui/toast/ToastProvider";

export default function ProductRow({
	product,
	categories,
	departments,
	setPendingProductData,
	setDuplicateProduct,
	onUpdate,
	onDelete,
	handleProductDelete,
	user,
	toEditableProduct,
	toProductForm,
	isSelected,
	toggleSelect,
}: {
	product: EditableProduct;
	categories: Category[];
	departments: { id: number; name: string }[];
	setPendingProductData: (data: EditableProduct | null) => void;
	setDuplicateProduct: (product: EditableProduct | null) => void;
	onUpdate: (updated: EditableProduct) => void;
	onDelete: (id: string | number) => void;
	handleProductDelete: (id: string | number) => void;
	user?: User | null;
	toEditableProduct: (product: Product) => EditableProduct;
	toProductForm: (product: EditableProduct) => any;
	isSelected: boolean;
	toggleSelect: () => void;
}) {
	const [isEditing, setIsEditing] = useState(product.id === "new" || (product as any).isEditing);
	if (typeof product.id === "string" && product.id.startsWith("new-") && !isEditing) return null;

	const { form, setForm, errors, setErrors, imageFile, setImageFile, imagePreview, setImagePreview, isSaving, handleSave } = useProductForm({
		product,
		toProductForm,
		toEditableProduct,
		user,
		categories,
		departments,
		setPendingProductData,
		setDuplicateProduct,
		onUpdate,
	});

	const isStale = (updatedAt: string) => {
		const daysDiff = (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24);
		return daysDiff > 30;
	};

	return (
		<tr className={isStale(product.updatedAt) ? "bg-yellow-50" : ""}>
			<td className="border border-black/10 px-2 py-1 text-center w-1/15">
				<input type="checkbox" checked={isSelected} onChange={toggleSelect} />
			</td>

			{user?.role === "superadmin" && (
				<td className="tableBlock border border-black/10 px-2 py-1 w-1/6">
					{isEditing ? (
						<DepartmentSelect
							value={form.departmentId}
							onChange={(val) => setForm({ ...form, departmentId: val })}
							departments={departments}
							error={errors.departmentId}
						/>
					) : (
						product.department?.name || "—"
					)}
				</td>
			)}

			<td className="tableBlock border border-black/10 px-2 py-1 w-1/6">
				{isEditing ? (
					<EditableCell
						value={form.brand}
						onChange={(val) => {
							setForm({ ...form, brand: val });
							setErrors((prev) => ({ ...prev, brand: undefined }));
						}}
						error={errors.brand}
					/>
				) : (
					product.brand
				)}
			</td>

			<td className="tableBlock border border-black/10 px-2 py-1 w-1/6">
				{isEditing ? (
					<EditableCell
						value={form.sku}
						onChange={(val) => {
							setForm({ ...form, sku: val });
							setErrors((prev) => ({ ...prev, sku: undefined }));
						}}
						error={errors.sku}
					/>
				) : (
					product.sku
				)}
			</td>

			<td className="tableBlock border border-black/10 px-2 py-1 w-1/6">
				{isEditing ? (
					<EditableCell
						value={form.title}
						onChange={(val) => {
							setForm({ ...form, title: val });
							setErrors((prev) => ({ ...prev, title: undefined }));
						}}
						error={errors.title}
					/>
				) : (
					product.title
				)}
			</td>

			<td className="tableBlock border border-black/10 px-2 py-1 w-1/6">
				{isEditing ? (
					<textarea
						value={form.description}
						onChange={(e) => setForm({ ...form, description: e.target.value })}
						className="w-full border px-1 py-0.5 text-sm rounded h-[26px]"
					/>
				) : (
					<p className="text-xs text-gray-600 line-clamp-2">{product.description || "—"}</p>
				)}
			</td>

			<td className="tableBlock border border-black/10 px-2 py-1 w-1/6">
				{isEditing ? (
					<EditableCell type="number" value={form.supplierPrice} onChange={(val) => setForm({ ...form, supplierPrice: val })} />
				) : product.supplierPrice ? (
					`${product.supplierPrice} ₽`
				) : (
					"—"
				)}
			</td>

			<td className="tableBlock border border-black/10 px-2 py-1 w-1/6">
				{isEditing ? (
					<EditableCell
						type="number"
						value={form.price}
						onChange={(val) => {
							setForm({ ...form, price: val });
							setErrors((prev) => ({ ...prev, price: undefined }));
						}}
						error={errors.price}
					/>
				) : (
					`${product.price} ₽`
				)}
			</td>

			<td className="tableBlock border border-black/10 px-2 py-1 w-1/6">
				{isEditing ? (
					<CategorySelect
						value={form.categoryId}
						onChange={(val) => setForm({ ...form, categoryId: val })}
						categories={categories.filter((cat) => !form.departmentId || cat.allowedDepartments?.some((d: any) => d.departmentId === Number(form.departmentId)))}
					/>
				) : (
					product.categoryTitle
				)}
			</td>

			<td className="tableBlock border border-black/10 px-2 py-1 w-1/6 text-center">
				{isEditing ? (
					<ImageCell
						image={product.image || null}
						imageFile={imageFile}
						setImageFile={setImageFile}
						setImagePreview={setImagePreview}
						onRemove={() => {
							setImageFile(null);
							setImagePreview(null);
							setForm((prev: ProductFormType) => ({ ...prev, image: "" }));
						}}
						productId={product.id}
					/>
				) : product.image ? (
					<div className="relative group w-10 h-10 mx-auto">
						<img
							src={product.image}
							alt="img"
							className="w-full h-full object-cover rounded border transition-all duration-200 group-hover:scale-150 group-hover:z-20"
						/>
					</div>
				) : (
					<span className="text-[10px] text-gray-400">Нет</span>
				)}
			</td>

			{user?.role !== "manager" && (
				<td className="tableBlock border border-black/10 px-2 py-1 text-center w-1/6">
					<ProductActions
						isEditing={isEditing}
						isSaving={isSaving}
						onEdit={() => setIsEditing(true)}
						onSave={async () => {
							const initial = toProductForm(product);

							// сравниваем значения формы с начальными
							const isUnchanged =
								initial.title === form.title &&
								initial.description === form.description &&
								initial.sku === form.sku &&
								initial.supplierPrice === form.supplierPrice &&
								initial.price === form.price &&
								initial.brand === form.brand &&
								initial.categoryId === form.categoryId &&
								initial.departmentId === form.departmentId &&
								initial.image === form.image;

							if (isUnchanged) {
								// ничего не менялось — вызываем отмену
								if (typeof product.id === "string" && product.id.startsWith("new-")) {
									handleProductDelete(product.id);
								} else {
									setIsEditing(false);
									setForm(toProductForm(product));
									setImageFile(null);
									setImagePreview(product.image || null);
									onUpdate({ ...product, isEditing: false });
								}
								return;
							}

							const success = await handleSave();
							if (success) {
								setIsEditing(false);
								setImageFile(null);
								setImagePreview(form.image || null);
								onUpdate({ ...product, isEditing: false });
							}
						}}
						onCancel={() => {
							if (typeof product.id === "string" && product.id.startsWith("new-")) {
								// Сразу удаляем новый товар без подтверждения
								onUpdate({ ...product, id: product.id, isEditing: false });
								handleProductDelete(product.id);
							} else {
								setIsEditing(false);
								setForm(toProductForm(product));
								setImageFile(null);
								setImagePreview(product.image || null);
								onUpdate({ ...product, isEditing: false });
							}
						}}
						onDelete={() => onDelete(product.id)}
						isNew={product.id === "new"}
					/>
				</td>
			)}
		</tr>
	);
}
