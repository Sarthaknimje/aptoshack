/**
 * Shelby Storage Info Component
 * Shows where premium content is stored on Shelby Protocol
 */

import React from 'react'
import { motion } from 'framer-motion'
import { Database, ExternalLink, Globe, Shield, HardDrive, Link as LinkIcon } from 'lucide-react'

interface ShelbyStorageInfoProps {
  blobUrl?: string
  blobId?: string
  contentType?: string
  className?: string
}

const ShelbyStorageInfo: React.FC<ShelbyStorageInfoProps> = ({
  blobUrl,
  blobId,
  contentType = 'video',
  className = ''
}) => {
  if (!blobUrl && !blobId) {
    return null
  }

  const shelbyNetwork = 'shelbynet'
  const shelbyExplorerUrl = blobId 
    ? `https://explorer.shelby.xyz/${shelbyNetwork}/blob/${blobId}`
    : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-xl p-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-blue-500/20 rounded-lg">
          <Database className="w-5 h-5 text-blue-400" />
        </div>
        
        <div className="flex-1">
          <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
            <HardDrive className="w-4 h-4" />
            Stored on Shelby Protocol
          </h4>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-300">
              <Globe className="w-4 h-4 text-blue-400" />
              <span className="font-mono text-xs break-all">{blobUrl || blobId}</span>
            </div>
            
            {blobId && (
              <div className="flex items-center gap-2 text-gray-300">
                <Shield className="w-4 h-4 text-green-400" />
                <span>Blob ID: <span className="font-mono text-xs">{blobId}</span></span>
              </div>
            )}
            
            <div className="flex items-center gap-2 text-gray-300">
              <span className="text-gray-400">Type:</span>
              <span className="capitalize">{contentType}</span>
            </div>
            
            <div className="pt-2 border-t border-white/10">
              <p className="text-xs text-gray-400 mb-2">
                Content is stored on Shelby's decentralized blob storage network, ensuring:
              </p>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>• High-performance read access</li>
                <li>• Decentralized storage across multiple providers</li>
                <li>• Token-gated access control</li>
                <li>• Permanent storage with expiration management</li>
              </ul>
            </div>
            
            {shelbyExplorerUrl && (
              <a
                href={shelbyExplorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 rounded-lg text-blue-300 text-xs transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                View on Shelby Explorer
              </a>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default ShelbyStorageInfo

