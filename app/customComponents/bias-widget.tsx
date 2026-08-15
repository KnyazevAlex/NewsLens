import { motion } from "framer-motion";

const BiasWidget = () => {
    return(
        <motion.div  initial={{ opacity: 1, y: 0}} animate={{opacity: 1, y: 0}} transition={{ type: "spring", stiffness:300, damping: 24 }} className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-neutral-900 text-sm">Bias Balance</h3>
                  <div className="w-4 h-4 rounded-full border border-neutral-200 flex items-center justify-center text-[10px] text-neutral-400 font-serif">i</div>
                </div>
                <p className="text-xs text-neutral-500 mb-4">Overview of today's coverage</p>
                
                {/* Donut Chart */}
                <div className="flex justify-center mb-5">
                  <div className="relative w-28 h-28 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-neutral-100"
                        strokeWidth="3.8"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-[#2563EB]"
                        strokeDasharray="64, 100"
                        strokeWidth="3.8"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-xl font-bold text-neutral-900 leading-none">64%</span>
                      <span className="text-[10px] font-medium text-neutral-500 mt-0.5">Neutral</span>
                    </div>
                  </div>
                </div>

                {/* Legend Grid */}
                <div className="grid grid-cols-2 gap-y-2 text-[10px] font-medium text-neutral-600 mb-6 px-2">
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-blue-600" />32% Left</div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-neutral-400" />64% Neutral</div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-red-500" />25% Right</div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-purple-500" />28% Mixed</div>
                </div>

                {/* Micro Sliders */}
                <div className="space-y-3.5 pt-2 border-t border-neutral-100">
                  {[
                    { label: "Left", color: "bg-blue-600", pos: "left-[32%]" },
                    { label: "Center / Neutral", color: "bg-neutral-700", pos: "left-[64%]" },
                    { label: "Right", color: "bg-red-500", pos: "left-[25%]" },
                    { label: "Mixed", color: "bg-purple-500", pos: "left-[28%]" },
                  ].map((stat) => (
                    <div key={stat.label} className="flex items-center gap-3">
                      <span className="text-[11px] text-neutral-600 font-medium w-28 truncate">{stat.label}</span>
                      <div className="flex-1 h-1.5 bg-neutral-100 rounded-full relative flex items-center">
                        <div className="absolute left-0 w-full flex justify-between px-1">
                           <div className="w-1 h-1 bg-neutral-300 rounded-full" />
                           <div className="w-1 h-1 bg-neutral-300 rounded-full" />
                           <div className="w-1 h-1 bg-neutral-300 rounded-full" />
                           <div className="w-1 h-1 bg-neutral-300 rounded-full" />
                           <div className="w-1 h-1 bg-neutral-300 rounded-full" />
                        </div>
                        <div className={`absolute h-3 w-3 rounded-full ${stat.color} border-2 border-white shadow-xs ${stat.pos} -translate-x-1/2`} />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
    )
}
export default BiasWidget