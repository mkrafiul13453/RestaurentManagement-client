import { apiGet } from "@/lib/api";

export function listCustomers({ page = 1, limit = 20, search = "", signal } = {}) {
  return apiGet("/customers", {
    query: { page, limit, search: search || undefined },
    signal,
  }).then((response) => {
    const customers = response?.data?.customers;
    const meta = response?.meta;
    const validCustomers =
      Array.isArray(customers) &&
      customers.every(
        (customer) =>
          customer &&
          typeof customer.email === "string" &&
          Object.keys(customer).every((key) => key === "email"),
      );
    const validMeta =
      meta &&
      Number.isInteger(meta.page) &&
      Number.isInteger(meta.limit) &&
      Number.isInteger(meta.total) &&
      Number.isInteger(meta.totalPages);

    if (!validCustomers || !validMeta) {
      throw new Error("The Restora server returned an invalid customer list");
    }

    return response;
  });
}
