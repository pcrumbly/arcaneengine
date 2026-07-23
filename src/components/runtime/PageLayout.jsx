import PageHeader from '@/components/runtime/PageHeader';
export default function PageLayout({eyebrow,title,description,actions,children}){
  return <div className="p-4 sm:p-6"><PageHeader eyebrow={eyebrow} title={title} description={description} actions={actions}/><div className="mt-5">{children}</div></div>;
}