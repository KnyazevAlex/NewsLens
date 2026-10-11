'use client'

import {motion, AnimatePresence} from "motion/react"
import { Button } from "@/components/ui/button"
import { Share2 } from "lucide-react"
import {useState, useEffect} from "react"

export default function Share() {
    const [linkCopied, setLinkCopied] = useState<boolean>(false);

    useEffect(() => {
        setTimeout(() => {
            setLinkCopied(false);
        }, 4000);
    }, [linkCopied]);

    const handleShareClick = async () => {
        
        try {
            await navigator.clipboard.writeText(window.location.href);
            setLinkCopied(true);
            
        }
        catch (error) {
            console.error("Failed to copy link: ", error);
        }
    }

    return(
        <motion.div>
             <AnimatePresence>
                {linkCopied && (
                
                        <motion.div 
                        className="fixed top-4 right-4 z-50 rounded-lg bg-green-500 px-4 py-2 text-white shadow-md"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        >
                            Link copied to clipboard!
                        </motion.div>
                
                )}
                 </AnimatePresence>
                <Button 
                    variant="ghost" size="icon" 
                    className="h-8 w-8 hover:text-neutral-900" 
                    aria-label="Share article"
                    disabled={linkCopied}
                    onClick={handleShareClick}>

                <Share2 className="h-4 w-4" />
                </Button>
           
        </motion.div>
    )
}