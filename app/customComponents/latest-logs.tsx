import { motion } from "framer-motion";
import { CheckCircle2, Calendar, FileText, Clock } from "lucide-react";

const LatestLogs = () => {
    return(
             <motion.div  initial={{ opacity: 1, y: 0}} animate={{opacity: 1, y: 0}} transition={{ type: "spring", stiffness:300, damping: 24 }} className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-neutral-900 text-sm">Latest Logs</h3>
                  <a href="#" className="text-xs font-semibold text-[#2563EB] hover:underline">View all</a>
                </div>

                <div className="space-y-5">
                  <div className="flex gap-3">
                    <div className="mt-0.5"><CheckCircle2 className="w-4 h-4 text-green-500" /></div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-0.5">
                        <span className="text-xs font-bold text-neutral-900">Article analysis completed</span>
                        <span className="text-[10px] text-neutral-400">2m ago</span>
                      </div>
                      <p className="text-[11px] text-neutral-500">NASA launches Artemis II mission</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="mt-0.5"><Calendar className="w-4 h-4 text-purple-500" /></div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-0.5">
                        <span className="text-xs font-bold text-neutral-900">Oxylabs schedule run</span>
                        <span className="text-[10px] text-neutral-400">15m ago</span>
                      </div>
                      <p className="text-[11px] text-neutral-500">Sources: 12 • Articles: 48</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="mt-0.5"><FileText className="w-4 h-4 text-blue-500" /></div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-0.5">
                        <span className="text-xs font-bold text-neutral-900">Articles scraped</span>
                        <span className="text-[10px] text-neutral-400">32m ago</span>
                      </div>
                      <p className="text-[11px] text-neutral-500">BBC, Reuters, Bloomberg</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="mt-0.5"><Clock className="w-4 h-4 text-orange-500" /></div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-0.5">
                        <span className="text-xs font-bold text-neutral-900">AI analysis started</span>
                        <span className="text-[10px] text-neutral-400">45m ago</span>
                      </div>
                      <p className="text-[11px] text-neutral-500">48 articles queued</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="mt-0.5"><CheckCircle2 className="w-4 h-4 text-green-500" /></div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-0.5">
                        <span className="text-xs font-bold text-neutral-900">Vector embeddings updated</span>
                        <span className="text-[10px] text-neutral-400">1h ago</span>
                      </div>
                      <p className="text-[11px] text-neutral-500">48 new articles</p>
                    </div>
                  </div>
                </div>
              </motion.div>
    )
}
export default LatestLogs