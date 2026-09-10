import { useAtlas } from '@/state/atlasStore'
import styles from './ConfirmarQueda.module.css'

/**
 * O aviso antes de apagar.
 *
 * Apagar um no derruba tudo que dependia dele para se manter conectado — e no
 * nucleo da cana um clique em "Plantio" derruba 34 dos 35 nos, porque toda a
 * usina desce dele. A regra e dura de proposito: e ela que impede o mapa de
 * afirmar metano saindo de um digestor sem substrato. Mas uma regra dura
 * aplicada em silencio, no primeiro clique errado, apaga o trabalho da pessoa.
 *
 * Enquanto esta faixa esta aberta nada foi perdido: o galho esta pintado no
 * mapa, e a decisao e informada em vez de descoberta depois.
 */
export function ConfirmarQueda() {
  const pendente = useAtlas((s) => s.pendenteDeApagar)
  const galho = useAtlas((s) => s.galhoQueCai)
  const nodes = useAtlas((s) => s.nodes)
  const confirmar = useAtlas((s) => s.confirmarApagar)
  const cancelar = useAtlas((s) => s.cancelarApagar)

  if (!pendente) return null

  const nome = nodes.find((n) => n.id === pendente)?.nome ?? pendente
  // O proprio nó não é "arraste": o que assusta é o que vem junto.
  const arrastados = galho.size - 1

  return (
    <div className={styles.faixa} role="alertdialog" aria-label="Confirmar remoção">
      <p className={styles.texto}>
        Apagar <strong>{nome}</strong> derruba{' '}
        <em>
          {arrastados} {arrastados === 1 ? 'nó que depende' : 'nós que dependem'} dele
        </em>{' '}
        — em vermelho no mapa.
      </p>
      <div className={styles.botoes}>
        <button type="button" className={styles.confirmar} onClick={confirmar}>
          Apagar mesmo assim
        </button>
        <button type="button" className={styles.cancelar} onClick={cancelar}>
          Cancelar
        </button>
      </div>
    </div>
  )
}
