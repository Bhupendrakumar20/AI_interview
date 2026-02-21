import { forwardRef } from "react";

const Table = forwardRef(({ className = "", ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={`w-full caption-bottom text-sm ${className}`}
      {...props}
    />
  </div>
));
Table.displayName = "Table";

const TableHeader = forwardRef(({ className = "", ...props }, ref) => (
  <thead ref={ref} className={`border-b border-dark-300 bg-dark-300 [&_tr]:border-b [&_tr]:border-dark-300 ${className}`} {...props} />
));
TableHeader.displayName = "TableHeader";

const TableBody = forwardRef(({ className = "", ...props }, ref) => (
  <tbody
    ref={ref}
    className={`[&_tr:last-child]:border-0 ${className}`}
    {...props}
  />
));
TableBody.displayName = "TableBody";

const TableFooter = forwardRef(({ className = "", ...props }, ref) => (
  <tfoot
    ref={ref}
    className={`border-t border-dark-300 bg-dark-300 font-medium [&>tr]:last:border-b-0 ${className}`}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

const TableRow = forwardRef(({ className = "", ...props }, ref) => (
  <tr
    ref={ref}
    className={`border-b border-dark-300 transition-colors hover:bg-dark-300 data-[state=selected]:bg-dark-300 ${className}`}
    {...props}
  />
));
TableRow.displayName = "TableRow";

const TableHead = forwardRef(({ className = "", ...props }, ref) => (
  <th
    ref={ref}
    className={`h-12 px-4 text-left align-middle font-medium text-light-100 [&:has([role=checkbox])]:pr-0 ${className}`}
    {...props}
  />
));
TableHead.displayName = "TableHead";

const TableCell = forwardRef(({ className = "", ...props }, ref) => (
  <td
    ref={ref}
    className={`px-4 py-3 align-middle text-light-100 [&:has([role=checkbox])]:pr-0 ${className}`}
    {...props}
  />
));
TableCell.displayName = "TableCell";

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell };
