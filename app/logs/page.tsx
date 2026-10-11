import LeftSideBar from "@/app/customComponents/left-side-bar";
import Header from "@/app/customComponents/header";
import LogsCard from "@/app/customComponents/logsCard";
import Head from "next/head";
import {getRecentLogs} from "@/lib/supabase/queries/logs";
import { auth } from "@clerk/nextjs/server"


const loadLogs = async () => {

const fiftyRecentLogs  = await getRecentLogs(50)

await auth.protect()

    return(
       <div className="flex min-h-screen bg-neutral-50 font-sans">
        <LeftSideBar />

      <main className="flex min-w-0 flex-1 flex-col">
        <Header />
        <div className="lg:grid-cols-4 md:grid-cols-3 sm: grid-cols-1 grid gap-6 p-5">
         
        {fiftyRecentLogs.map((log) => (
          <LogsCard
            id={log.id}
            key={log.id}
            level={log.level}
            event={log.event}
            message={log.message}
            detail={log.detail}
            createdAt={log.createdAt}
          />
        ))}
      
        </div>
        </main>
    </div>
    )
}

export default loadLogs