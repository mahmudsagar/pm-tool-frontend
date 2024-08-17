import Link from "@/BetterRouter/Link";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Fragment } from "react";
import { useMatches } from "react-router-dom";

const DynamicBreadCrumb = () => {
  let matches = useMatches();

  matches = matches.filter((item, index, self) =>
    index === self.findIndex((obj) => obj.pathname === item.pathname)
  );

  const makeTitleFromPath = (path) => {
    if (path === '/') return 'Home';
    /** remove trail slash only and replace middle slash with - */
    const title = path.replace(/\//g, '-').replace(/^-|-$/g, '')
    return title.charAt(0).toUpperCase() + title.slice(1);
  }
  return (
    <div>
      <Breadcrumb>
        <BreadcrumbList className="sm:gap-1.5">
          {matches.map((crumb, index) => (
            <Fragment key={index}>
              <BreadcrumbItem className="text-xs font-medium">
                {index < matches.length - 1 ?
                  <Link href={crumb.pathname}>{makeTitleFromPath(crumb.pathname)}</Link>
                  :
                  <span className="text-purple-600 dark:text-purple-400">{makeTitleFromPath(crumb.pathname)}</span>
                }
              </BreadcrumbItem>
              {index < matches.length - 1 && (
                <BreadcrumbSeparator className="text-xs">
                  /
                </BreadcrumbSeparator>
              )}
            </Fragment>
          ))}
          {/* <BreadcrumbItem>
            <Link href="/" className="text-xs font-medium">Home</Link>
          </BreadcrumbItem>

         
          <BreadcrumbItem>
            <Link href="/check" className="text-xs font-medium">Components</Link>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            /
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbPage className="text-xs font-medium">Breadcrumb</BreadcrumbPage>
          </BreadcrumbItem> */}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
};

export default DynamicBreadCrumb;