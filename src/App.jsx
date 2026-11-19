import { useMemo, useRef, useState } from 'react'
import './App.css'

const CHAVE_ARMAZENAMENTO = 'controle-gastos:v1'

const CATEGORIAS = [
  'Alimentação',
  'Transporte',
  'Moradia',
  'Saúde',
  'Educação',
  'Lazer',
  'Compras',
  'Outros',
]

const formatadorMoeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const formatadorData = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

function gerarId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

function normalizarValor(texto) {
  const limpo = texto.trim().replace(/\s/g, '')

  if (!limpo) return NaN

  // Aceita 1234,56 / 1234.56 / 1.234,56.
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(limpo)) {
    return Number(limpo.replace(/\./g, '').replace(',', '.'))
  }

  if (/^\d+(,\d{1,2})?$/.test(limpo)) {
    return Number(limpo.replace(',', '.'))
  }

  if (/^\d+(\.\d{1,2})?$/.test(limpo)) {
    return Number(limpo)
  }

  return NaN
}

function formatarMoeda(valor) {
  return formatadorMoeda.format(valor)
}

function formatarData(dataISO) {
  const data = new Date(dataISO)

  if (Number.isNaN(data.getTime())) return ''

  return formatadorData.format(data)
}

function normalizarGasto(item) {
  if (!item || typeof item !== 'object') return null

  const descricao =
    typeof item.descricao === 'string' ? item.descricao.trim().slice(0, 80) : ''
  const valor =
    typeof item.valor === 'number' && Number.isFinite(item.valor)
      ? Math.round(item.valor * 100) / 100
      : NaN
  const categoria = CATEGORIAS.includes(item.categoria) ? item.categoria : ''

  if (!descricao || !Number.isFinite(valor) || valor <= 0 || !categoria) {
    return null
  }

  const data = new Date(item.criadoEm)
  const criadoEm = Number.isNaN(data.getTime())
    ? new Date().toISOString()
    : data.toISOString()

  return {
    id: typeof item.id === 'string' && item.id ? item.id : gerarId(),
    descricao,
    valor,
    categoria,
    criadoEm,
  }
}

function carregarGastos() {
  try {
    const dados = JSON.parse(localStorage.getItem(CHAVE_ARMAZENAMENTO) ?? '[]')

    if (!Array.isArray(dados)) return []

    return dados.map(normalizarGasto).filter(Boolean)
  } catch {
    return []
  }
}

function validarCampos(campos) {
  const erros = {}

  const descricao = campos.descricao.trim()
  if (!descricao) {
    erros.descricao = 'Informe uma descrição para o gasto.'
  } else if (descricao.length > 80) {
    erros.descricao = 'A descrição deve ter no máximo 80 caracteres.'
  }

  const valor = normalizarValor(campos.valor)
  if (!campos.valor.trim()) {
    erros.valor = 'Informe o valor do gasto.'
  } else if (!Number.isFinite(valor)) {
    erros.valor = 'Use um valor válido, por exemplo: 12,50.'
  } else if (valor <= 0) {
    erros.valor = 'O valor deve ser maior que zero.'
  } else if (valor > 1000000000) {
    erros.valor = 'O valor informado é muito alto.'
  }

  if (!campos.categoria) {
    erros.categoria = 'Selecione uma categoria.'
  } else if (!CATEGORIAS.includes(campos.categoria)) {
    erros.categoria = 'Selecione uma categoria válida.'
  }

  return erros
}

function App() {
  const [gastos, setGastos] = useState(carregarGastos)
  const [campos, setCampos] = useState({
    descricao: '',
    valor: '',
    categoria: '',
  })
  const [erros, setErros] = useState({})
  const [aviso, setAviso] = useState('')
  const camposRef = useRef({})

  function salvarGastos(proximosGastos) {
    setGastos(proximosGastos)

    try {
      localStorage.setItem(CHAVE_ARMAZENAMENTO, JSON.stringify(proximosGastos))
      setAviso('')
    } catch {
      setAviso(
        'Não foi possível salvar no localStorage. Verifique as configurações do navegador.',
      )
    }
  }

  const total = useMemo(
    () => gastos.reduce((soma, gasto) => soma + gasto.valor, 0),
    [gastos],
  )

  const gastosOrdenados = useMemo(
    () =>
      [...gastos].sort(
        (a, b) =>
          new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime(),
      ),
    [gastos],
  )

  function atualizarCampo(nome, valor) {
    setCampos((anteriores) => ({ ...anteriores, [nome]: valor }))
    setErros((anteriores) => {
      if (!anteriores[nome]) return anteriores

      const proximos = { ...anteriores }
      delete proximos[nome]
      return proximos
    })
  }

  function handleSubmit(evento) {
    evento.preventDefault()

    const novosErros = validarCampos(campos)
    setErros(novosErros)

    const primeiroErro = Object.keys(novosErros)[0]
    if (primeiroErro) {
      camposRef.current[primeiroErro]?.focus()
      return
    }

    const valor = normalizarValor(campos.valor)

    salvarGastos([
      ...gastos,
      {
        id: gerarId(),
        descricao: campos.descricao.trim(),
        valor: Math.round(valor * 100) / 100,
        categoria: campos.categoria,
        criadoEm: new Date().toISOString(),
      },
    ])

    setCampos({ descricao: '', valor: '', categoria: '' })
    camposRef.current.descricao?.focus()
  }

  function excluirGasto(id) {
    salvarGastos(gastos.filter((gasto) => gasto.id !== id))
  }

  return (
    <div className="app">
      <header className="cabecalho">
        <div className="container cabecalho__conteudo">
          <p className="cabecalho__etiqueta">Finanças pessoais</p>
          <h1>Controle de gastos</h1>
          <p className="cabecalho__resumo">
            Registre suas despesas, acompanhe o total e mantenha tudo salvo neste
            navegador.
          </p>
        </div>
      </header>

      <main className="container principal">
        <section
          className="cartao cartao--formulario"
          aria-labelledby="titulo-formulario"
        >
          <div className="secao-cabecalho">
            <h2 id="titulo-formulario">Adicionar gasto</h2>
            <p>Preencha os campos abaixo para registrar uma nova despesa.</p>
          </div>

          <form className="formulario" onSubmit={handleSubmit} noValidate>
            <div className="campo">
              <label htmlFor="descricao">Descrição</label>
              <div
                className={`campo__entrada${erros.descricao ? ' campo__entrada--invalido' : ''}`}
              >
                <input
                  ref={(elemento) => {
                    camposRef.current.descricao = elemento
                  }}
                  id="descricao"
                  name="descricao"
                  type="text"
                  value={campos.descricao}
                  onChange={(evento) =>
                    atualizarCampo('descricao', evento.target.value)
                  }
                  placeholder="Ex.: Almoço no restaurante"
                  maxLength={80}
                  autoComplete="off"
                  aria-invalid={Boolean(erros.descricao)}
                  aria-describedby={
                    erros.descricao ? 'erro-descricao' : 'dica-descricao'
                  }
                />
              </div>
              {erros.descricao ? (
                <p className="campo__erro" id="erro-descricao" role="alert">
                  {erros.descricao}
                </p>
              ) : (
                <p className="campo__dica" id="dica-descricao">
                  Use até 80 caracteres.
                </p>
              )}
            </div>

            <div className="campo">
              <label htmlFor="valor">Valor (R$)</label>
              <div
                className={`campo__entrada${erros.valor ? ' campo__entrada--invalido' : ''}`}
              >
                <span className="campo__prefixo" aria-hidden="true">
                  R$
                </span>
                <input
                  ref={(elemento) => {
                    camposRef.current.valor = elemento
                  }}
                  id="valor"
                  name="valor"
                  type="text"
                  inputMode="decimal"
                  value={campos.valor}
                  onChange={(evento) => atualizarCampo('valor', evento.target.value)}
                  placeholder="0,00"
                  autoComplete="off"
                  aria-invalid={Boolean(erros.valor)}
                  aria-describedby={erros.valor ? 'erro-valor' : 'dica-valor'}
                />
              </div>
              {erros.valor ? (
                <p className="campo__erro" id="erro-valor" role="alert">
                  {erros.valor}
                </p>
              ) : (
                <p className="campo__dica" id="dica-valor">
                  Exemplo: 12,50 ou 1.234,56.
                </p>
              )}
            </div>

            <div className="campo">
              <label htmlFor="categoria">Categoria</label>
              <div
                className={`campo__entrada${erros.categoria ? ' campo__entrada--invalido' : ''}`}
              >
                <select
                  ref={(elemento) => {
                    camposRef.current.categoria = elemento
                  }}
                  id="categoria"
                  name="categoria"
                  value={campos.categoria}
                  onChange={(evento) =>
                    atualizarCampo('categoria', evento.target.value)
                  }
                  aria-invalid={Boolean(erros.categoria)}
                  aria-describedby={
                    erros.categoria ? 'erro-categoria' : 'dica-categoria'
                  }
                >
                  <option value="">Selecione uma categoria</option>
                  {CATEGORIAS.map((categoria) => (
                    <option key={categoria} value={categoria}>
                      {categoria}
                    </option>
                  ))}
                </select>
              </div>
              {erros.categoria ? (
                <p className="campo__erro" id="erro-categoria" role="alert">
                  {erros.categoria}
                </p>
              ) : (
                <p className="campo__dica" id="dica-categoria">
                  Escolha a categoria que melhor descreve o gasto.
                </p>
              )}
            </div>

            <button className="botao-primario" type="submit">
              <span aria-hidden="true">+</span>
              Adicionar gasto
            </button>
          </form>

          {aviso && (
            <p className="aviso" role="alert">
              {aviso}
            </p>
          )}
        </section>

        <section className="cartao cartao--resumo" aria-labelledby="titulo-resumo">
          <div className="secao-cabecalho">
            <h2 id="titulo-resumo">Resumo</h2>
            <p>Atualizado automaticamente a cada gasto.</p>
          </div>

          <dl className="resumo__lista">
            <div className="resumo__item resumo__item--total">
              <dt>Total dos gastos</dt>
              <dd>
                <output aria-live="polite">{formatarMoeda(total)}</output>
              </dd>
            </div>
            <div className="resumo__item">
              <dt>Gastos registrados</dt>
              <dd>{gastos.length}</dd>
            </div>
          </dl>
        </section>

        <section className="cartao cartao--lista" aria-labelledby="titulo-lista">
          <div className="secao-cabecalho secao-cabecalho--entre">
            <div>
              <h2 id="titulo-lista">Gastos registrados</h2>
              <p>Seus lançamentos ficam salvos neste navegador.</p>
            </div>
            {gastosOrdenados.length > 0 && (
              <span className="contador">
                {gastosOrdenados.length}{' '}
                {gastosOrdenados.length === 1 ? 'gasto' : 'gastos'}
              </span>
            )}
          </div>

          {gastosOrdenados.length === 0 ? (
            <div className="vazio">
              <p className="vazio__titulo">Nenhum gasto por aqui ainda</p>
              <p className="vazio__texto">
                Adicione um gasto para vê-lo aparecer nesta lista.
              </p>
            </div>
          ) : (
            <ul className="lista-gastos">
              {gastosOrdenados.map((gasto) => (
                <li className="gasto" key={gasto.id}>
                  <div className="gasto__principal">
                    <span className="gasto__categoria">{gasto.categoria}</span>
                    <p className="gasto__descricao">{gasto.descricao}</p>
                    <time className="gasto__data" dateTime={gasto.criadoEm}>
                      {formatarData(gasto.criadoEm)}
                    </time>
                  </div>
                  <p className="gasto__valor">{formatarMoeda(gasto.valor)}</p>
                  <button
                    type="button"
                    className="botao-excluir"
                    onClick={() => excluirGasto(gasto.id)}
                    aria-label={`Excluir gasto ${gasto.descricao}, no valor de ${formatarMoeda(gasto.valor)}`}
                  >
                    <span aria-hidden="true">×</span>
                    Excluir
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <footer className="rodape">
        <div className="container">
          <p>Os dados ficam apenas neste navegador.</p>
        </div>
      </footer>
    </div>
  )
}

export default App
