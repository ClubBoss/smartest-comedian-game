import Link from "next/link";
import { QuestionBank } from "./question-bank";

export default function QuestionsPage() {
  return (
    <>
      <div className="question-bank-tools-link"><Link className="secondary" href="/host/questions/tools">Bulk import & duplicate</Link></div>
      <QuestionBank />
    </>
  );
}
