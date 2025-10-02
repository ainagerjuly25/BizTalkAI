import { type Company } from "@shared/schema";
import CompanyListItem from "./CompanyListItem";

interface CompanyListProps {
  companies: Company[];
  onCompanyClick: (company: Company) => void;
}

export default function CompanyList({ companies, onCompanyClick }: CompanyListProps) {
  return (
    <div className="px-4 pb-3" data-testid="list-companies">
      {companies.map((company) => (
        <CompanyListItem
          key={company}
          company={company}
          onClick={onCompanyClick}
        />
      ))}
    </div>
  );
}
