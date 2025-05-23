import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./ui/pagination";

const EnhancePagination = ({
  currentPage,
  setCurrentPage,
  itemsPerPage,
  dataLength,
  maxView = 5,
}: {
  currentPage: number;
  setCurrentPage: (value: React.SetStateAction<number>) => void;
  itemsPerPage: number;
  dataLength: number;
  maxView?: number;
}) => {
  const totalPages = Math.ceil(dataLength / itemsPerPage);
  const startPage = Math.max(1, currentPage - Math.floor(maxView / 2));
  const endPage = Math.min(totalPages, startPage + maxView - 1);
  const pagesToShow = Array.from(
    { length: endPage - startPage + 1 },
    (_, i) => startPage + i
  );

  return (
    <div className="flex items-center justify-center space-x-2 py-4">
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              className={
                currentPage === 1 ? "pointer-events-none opacity-50" : ""
              }
            />
          </PaginationItem>
          {pagesToShow.map((page) => (
            <PaginationItem key={page}>
              <PaginationLink
                isActive={currentPage === page}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          ))}
          {pagesToShow.length === maxView && (
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          )}
          <PaginationItem>
            <PaginationNext
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              className={
                currentPage === totalPages
                  ? "pointer-events-none opacity-50"
                  : ""
              }
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
};

export default EnhancePagination;
