import { describe, expect, it } from 'vitest'
import { asset } from '../assets'

describe('asset', () => {
  it('prefixa o caminho com o BASE_URL do build', () => {
    expect(asset('logos/cp2b-avatar-gradient.svg')).toBe(
      `${import.meta.env.BASE_URL}logos/cp2b-avatar-gradient.svg`,
    )
  })

  it('nao duplica a barra quando o caminho ja comeca com uma', () => {
    expect(asset('/data/cana.json')).toBe(`${import.meta.env.BASE_URL}data/cana.json`)
  })
})
