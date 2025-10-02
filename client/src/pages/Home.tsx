import { useState, useMemo } from "react";
import { companies, type Company } from "@shared/schema";
import DirectoryHeader from "@/components/DirectoryHeader";
import SearchBar from "@/components/SearchBar";
import CompanyList from "@/components/CompanyList";
import VoiceModal from "@/components/VoiceModal";

export default function Home() {
  const [searchValue, setSearchValue] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  const filteredCompanies = useMemo(() => {
    if (!searchValue.trim()) return companies;
    
    const query = searchValue.toLowerCase().trim();
    const startsWith = companies.filter(c => 
      c.toLowerCase().startsWith(query)
    );
    const includes = companies.filter(c => 
      !c.toLowerCase().startsWith(query) && 
      c.toLowerCase().includes(query)
    );
    
    return [...startsWith, ...includes];
  }, [searchValue]);

  const handleCompanyClick = (company: Company) => {
    setSelectedCompany(company);
  };

  const handleCloseModal = () => {
    setSelectedCompany(null);
  };

  return (
    <div className="min-h-screen flex justify-center bg-background">
      <main className="w-full max-w-[420px] bg-card shadow-xl mx-3 my-0 sm:my-3 sm:rounded-[20px] overflow-hidden flex flex-col">
        <div className="sticky top-0 z-10 bg-card border-b border-border shadow-sm">
          <DirectoryHeader />
          <SearchBar
            value={searchValue}
            onChange={setSearchValue}
            onSearch={() => console.log("Search triggered")}
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          <CompanyList
            companies={filteredCompanies}
            onCompanyClick={handleCompanyClick}
          />
        </div>
      </main>

      {selectedCompany && (
        <VoiceModal
          company={selectedCompany}
          isOpen={!!selectedCompany}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
