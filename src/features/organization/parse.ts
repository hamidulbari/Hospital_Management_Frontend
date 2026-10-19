import { parsePage, type PageInfo } from "@/lib/api/meta";
import { bool, list, rec, str, type Rec } from "@/lib/utils/guards";

export type Hospital = {
  id: string;
  code: string;
  name: string;
  registrationNo: string;
  gstin: string;
  pan: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  countryCode: string;
  phone: string;
  email: string;
  timezone: string;
  currencyCode: string;
  locale: string;
  dateFormat: string;
  status: string;
};
export type BranchItem = { id: string; code: string; name: string; line1: string; line2: string; city: string; state: string; pincode: string; phone: string; isMain: boolean; status: string };
export type DepartmentItem = { id: string; code: string; name: string; type: string; status: string; branchId: string; branchName: string; parentId: string; parentName: string };

function addressOf(source: Rec) {
  const a = rec(source.address);
  return {
    line1: str(a.line1) || str(source.address_line1),
    line2: str(a.line2) || str(source.address_line2),
    city: str(a.city) || str(source.city),
    state: str(a.state) || str(source.state),
    pincode: str(a.pincode) || str(source.pincode),
    countryCode: str(a.country_code),
  };
}

/** The hospital list answers with one hospital for now. Real shape (confirmed): see GET /organization/hospitals. */
export function parseHospital(body: unknown): Hospital | null {
  const data = rec(body).data;
  const h = rec(Array.isArray(data) ? data[0] : data);
  if (!str(h.id)) return null;
  const address = addressOf(h);
  return {
    id: str(h.id),
    code: str(h.code),
    name: str(h.name),
    registrationNo: str(h.registration_no),
    gstin: str(h.gstin),
    pan: str(h.pan),
    ...address,
    phone: str(h.phone),
    email: str(h.email),
    timezone: str(h.timezone),
    currencyCode: str(h.currency_code),
    locale: str(h.default_locale),
    dateFormat: str(h.date_format),
    status: str(h.status),
  };
}

export function parseBranches(body: unknown): { items: BranchItem[] } & PageInfo {
  const items = list(rec(body).data).map((raw) => {
    const b = rec(raw);
    const a = addressOf(b);
    return {
      id: str(b.id),
      code: str(b.code),
      name: str(b.name),
      line1: a.line1,
      line2: a.line2,
      city: a.city,
      state: a.state,
      pincode: a.pincode,
      phone: str(b.phone),
      isMain: bool(b.is_main),
      status: str(b.status),
    };
  });
  return { items, ...parsePage(body, items.length) };
}

export function parseDepartments(body: unknown): { items: DepartmentItem[] } & PageInfo {
  const items = list(rec(body).data).map((raw) => {
    const d = rec(raw);
    return {
      id: str(d.id),
      code: str(d.code),
      name: str(d.name),
      type: str(d.type),
      status: str(d.status),
      branchId: str(d.branch_id) || str(rec(d.branch).id),
      branchName: str(rec(d.branch).name),
      parentId: str(d.parent_id) || str(rec(d.parent).id),
      parentName: str(rec(d.parent).name),
    };
  });
  return { items, ...parsePage(body, items.length) };
}