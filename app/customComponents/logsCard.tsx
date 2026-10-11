'use client'

import {LogItemData} from "@/lib/supabase/queries/logs"
import { motion } from "motion/react"

export default  function logsCard ({id, level, event, message, detail, createdAt} : LogItemData) {

    return(

        <div className="flex  gap-2 rounded-lg bg-white p-4 shadow-md">
          <motion.div id={`log-${id}`} className="flex flex-col gap-2"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 24, delay: 0.1 }}
          
          >
                <p className={`text-shadow-lg text-shadow-[#E6E3E3] font-bold ${level === 'error' ? 'text-red-500' : level === 'warning' ? 'text-yellow-500' : 'text-green-500'}`}>{level}</p>
                <p className="text-lg italic">{event}</p>
                <p className="text-gray-600">{message}</p>
                <p>{detail}</p>
                <p>{createdAt}</p>
          </motion.div>
        </div>
      
    )
}
