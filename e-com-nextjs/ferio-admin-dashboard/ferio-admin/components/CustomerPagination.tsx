"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Pagination from "./Pagination";

interface CustomerPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
}

export default function CustomerPagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
}: CustomerPaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handlePageChange = (targetPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(targetPage));
    router.push(`/dashboard/customers?${params.toString()}`);
  };

  return (
    <Pagination
      currentPage={currentPage}
      totalPages={totalPages}
      totalItems={totalItems}
      pageSize={pageSize}
      onPageChange={handlePageChange}
    />
  );
}
