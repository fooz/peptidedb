import Link from "next/link";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
};

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const filteredItems = items.filter((item) => item.label.trim().length > 0);
  if (filteredItems.length < 2) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="breadcrumbs">
      <ol itemScope itemType="https://schema.org/BreadcrumbList">
        {filteredItems.map((item, index) => {
          const isLast = index === filteredItems.length - 1;
          return (
            <li key={`${item.label}-${index}`} itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
              {item.href && !isLast ? (
                <Link href={item.href} itemProp="item">
                  <span itemProp="name">{item.label}</span>
                </Link>
              ) : (
                <span aria-current="page" itemProp="name">
                  {item.label}
                </span>
              )}
              <meta itemProp="position" content={String(index + 1)} />
              {!isLast ? <span className="breadcrumb-sep">/</span> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
