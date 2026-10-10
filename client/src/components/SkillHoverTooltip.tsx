import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react'
import { skillRequirementDetail, skillUseDetail } from '../game/character/skillRequirements'
import { SKILLS } from '../game/character/skillsConfig'
import type { CharacterSheetPayload } from '../game/events'
import { SkillDetailTooltip } from './SkillDetailTooltip'
import { AnchoredFloatingTooltip } from './tooltip/AnchoredFloatingTooltip'
import { useHoverAnchor } from './tooltip/useHoverAnchor'

type Props = {
  skillId: string
  sheet: CharacterSheetPayload
  tabJobId?: string
  variant?: 'full' | 'use'
  footerLines?: string[]
  children: ReactElement
}

export function SkillHoverTooltip({
  skillId,
  sheet,
  tabJobId,
  variant = 'use',
  footerLines,
  children,
}: Props) {
  const { anchor, onMouseEnter, onMouseLeave } = useHoverAnchor()
  const skill = SKILLS[skillId]
  const jobId = tabJobId ?? skill?.jobId ?? sheet.jobId
  const detail =
    skill != null
      ? variant === 'full'
        ? skillRequirementDetail(skill, sheet, jobId)
        : skillUseDetail(skill, sheet)
      : null

  if (!isValidElement(children)) {
    return children as ReactNode
  }

  const child = children as ReactElement<{
    title?: string
    onMouseEnter?: (e: React.MouseEvent<HTMLElement>) => void
    onMouseLeave?: (e: React.MouseEvent<HTMLElement>) => void
  }>

  return (
    <>
      {cloneElement(child, {
        title: '',
        onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
          child.props.onMouseEnter?.(e)
          onMouseEnter(e)
        },
        onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
          child.props.onMouseLeave?.(e)
          onMouseLeave()
        },
      })}
      {anchor && skill && detail && (
        <AnchoredFloatingTooltip anchor={anchor} preferredWidth={240}>
          <SkillDetailTooltip
            skillName={skill.name}
            detail={detail}
            inline
            footerLines={footerLines}
          />
        </AnchoredFloatingTooltip>
      )}
    </>
  )
}
