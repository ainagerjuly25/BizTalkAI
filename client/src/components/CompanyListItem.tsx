import { type Company } from "@shared/schema";

interface CompanyListItemProps {
  company: Company;
  onClick: (company: Company) => void;
}

export default function CompanyListItem({ company, onClick }: CompanyListItemProps) {
  return (
    <div
      onClick={() => onClick(company)}
      className="flex items-center py-3.5 border-b border-border last:border-b-0 cursor-pointer active-elevate-2 rounded-xl transition-colors"
      data-testid={`item-company-${company.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="w-2 h-2 rounded-full bg-border mr-3" />
      <span className="text-base">{company}</span>
    </div>
  );
}
