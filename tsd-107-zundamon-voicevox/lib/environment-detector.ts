/**
 * Environment detection utility for VoiceVox client
 * Handles different deployment environments and provides fallback mechanisms
 */

export interface EnvironmentConfig {
  isCloudRun: boolean
  isDocker: boolean
  isLocal: boolean
  environment: 'cloud-run' | 'docker' | 'local'
  defaultVoicevoxUrl: string
}

/**
 * Detect current environment and return appropriate configuration
 */
export function detectEnvironment(): EnvironmentConfig {
  // Check for Cloud Run environment
  const isCloudRun = !!(
    process.env.K_SERVICE ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.K_CONFIGURATION ||
    process.env.K_REVISION
  )

  // Check for Docker environment
  const isDocker = !!(
    process.env.HOSTNAME?.startsWith('docker') ||
    process.env.DOCKER_CONTAINER ||
    process.env.DOCKER ||
    // More reliable: check if running in container via hostname pattern
    (process.env.HOSTNAME && /^[a-f0-9]{12}$/.test(process.env.HOSTNAME))
  )

  // Default to local if neither Cloud Run nor Docker
  const isLocal = !isCloudRun && !isDocker

  let environment: 'cloud-run' | 'docker' | 'local'
  let defaultVoicevoxUrl: string

  if (isCloudRun) {
    environment = 'cloud-run'
    // For Cloud Run, we might use an external VoiceVox service or internal service
    defaultVoicevoxUrl = 'http://voicevox:50021' // Default to internal service
  } else if (isDocker) {
    environment = 'docker'
    defaultVoicevoxUrl = 'http://voicevox:50021'
  } else {
    environment = 'local'
    defaultVoicevoxUrl = 'http://localhost:50021'
  }

  return {
    isCloudRun,
    isDocker,
    isLocal,
    environment,
    defaultVoicevoxUrl
  }
}

/**
 * Get VoiceVox URL with fallback logic
 * Priority: ENV variable -> environment default -> fallback URLs
 */
export function getVoicevoxUrl(): string {
  const envConfig = detectEnvironment()

  // Primary: Use environment variable if set
  const envUrl = process.env.VOICEVOX_URL
  if (envUrl) {
    console.log(`[Environment Detector] Using VOICEVOX_URL from environment: ${envUrl}`)
    console.log(`[Environment Detector] Detected environment: ${envConfig.environment}`)
    return envUrl
  }

  // Secondary: Use environment-specific default
  const defaultUrl = envConfig.defaultVoicevoxUrl
  console.log(`[Environment Detector] Using default URL for ${envConfig.environment}: ${defaultUrl}`)

  return defaultUrl
}

/**
 * Get fallback URLs for connection testing
 * Returns an array of URLs to try in order
 */
export function getFallbackUrls(): string[] {
  const envConfig = detectEnvironment()
  const primaryUrl = getVoicevoxUrl()

  const fallbackUrls: string[] = [primaryUrl]

  // Add environment-specific fallbacks
  if (envConfig.isCloudRun) {
    // In Cloud Run, try internal service first, then external if available
    if (primaryUrl !== 'http://voicevox:50021') {
      fallbackUrls.push('http://voicevox:50021')
    }
    // Could add external VoiceVox service URLs here if available
  } else if (envConfig.isDocker) {
    // In Docker, try container name first, then localhost
    if (primaryUrl !== 'http://voicevox:50021') {
      fallbackUrls.push('http://voicevox:50021')
    }
    if (primaryUrl !== 'http://localhost:50021') {
      fallbackUrls.push('http://localhost:50021')
    }
  } else {
    // In local development, try localhost first, then container name
    if (primaryUrl !== 'http://localhost:50021') {
      fallbackUrls.push('http://localhost:50021')
    }
    if (primaryUrl !== 'http://voicevox:50021') {
      fallbackUrls.push('http://voicevox:50021')
    }
  }

  // Remove duplicates while preserving order
  return Array.from(new Set(fallbackUrls))
}

/**
 * Log environment detection results for debugging
 */
export function logEnvironmentInfo(): void {
  const envConfig = detectEnvironment()
  const voicevoxUrl = getVoicevoxUrl()
  const fallbackUrls = getFallbackUrls()

  console.log('[Environment Detector] Environment Information:')
  console.log(`  Environment: ${envConfig.environment}`)
  console.log(`  Is Cloud Run: ${envConfig.isCloudRun}`)
  console.log(`  Is Docker: ${envConfig.isDocker}`)
  console.log(`  Is Local: ${envConfig.isLocal}`)
  console.log(`  Primary VoiceVox URL: ${voicevoxUrl}`)
  console.log(`  Fallback URLs: ${fallbackUrls.join(', ')}`)
  console.log(`  VOICEVOX_URL env var: ${process.env.VOICEVOX_URL || 'not set'}`)
}