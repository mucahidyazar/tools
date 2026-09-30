'use client'
import { PasswordGenerator } from '@/components/password-generator'
import { useLanguage } from '@/hooks/use-language'

export function PasswordTool() {
  const language = useLanguage()
  return <PasswordGenerator language={language} />
}
