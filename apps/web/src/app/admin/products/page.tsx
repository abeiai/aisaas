import { BillingProductManager } from "@/components/admin/billing-product-manager";
import { AdminShell } from "@/components/shell/admin-shell";
import { getAdminBillingProducts } from "@/lib/payment-admin-api";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const products = await getAdminBillingProducts();

  return (
    <AdminShell
      active="/admin/products"
      title="产品管理"
      description="管理前台用户可购买的点数充值方案。"
    >
      <BillingProductManager products={products} />
    </AdminShell>
  );
}
