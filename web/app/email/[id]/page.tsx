import EmailView from './EmailView';
export default function Page({ params }: { params: { id: string } }) { return <EmailView emailId={params.id} />; }
