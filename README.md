# Musical Escritor

Painel administrativo da equipe do musical — agenda de ensaios, tarefas, músicas,
eventos, equipe, personagens, arquivos e notificações. Sem build: HTML, CSS e JS
puros com **Firebase Realtime Database** opcional (modo demonstração quando offline).

## Rodando localmente

O app precisa ser servido por HTTP (não abre como `file://`):

```bash
npm run dev        # usa npx serve (porta 3000) — abra http://localhost:3000
```

Ou qualquer servidor estático (VS Code Live Server, python -m http.server etc.).

## Login

- Login por **e-mail e senha** (Firebase Auth).
- Os usuários são cadastrados manualmente no console do Firebase (Não existe
  auto-cadastro).
- **Admins**: a lista fica em `musical/admins` no banco. Na primeira escrita, o
  esquema `{ "k0": "admoescritor@musical.com" }` é criado automaticamente; você
  pode acrescentar outros admins como `k1`, `k2` etc. (só admins editam esse nó).
- Caixa **"Lembre-se de mim"** mantém o login por sessão/persistência local.

## Banco de dados

Estrutura no Realtime Database:

```
musical/
  admins/          -> { k0: "<email-admin>" , ... }
  config/          -> categorias e ajustes gerais
  personagens/     -> personagens da peça
  equipes/         -> áreas/equipes
  integrantes/     -> membros (slug, nome, personagem, equipes, status)
  tarefas/ ensaios/ musicas/ eventos/ arquivos/ links/
  notificacoes/    -> avisos exibidos no app
  perfil/          -> perfil de boas-vindas por usuário (perfil_<email>)
  preferencias/    -> preferências por usuário (pref_<email>): push, app, escuro
  tokens/          -> tokens de push (FCM, quando configurado)
```

As regras prontas estão em **`database.rules.json`** (leitura autenticada; escrita
apenas para admins, com exceção de `perfil`, `preferencias` e `tokens` do próprio
usuário). Cole esse JSON inteiro em *Realtime Database → Regras*.

## Notificações

- **No app (celular/PC)**: popups no canto da tela sempre que chega aviso novo
  (`notificacoes`), com o banner pedindo permissão na primeira visita.
- **Push real (chega com o app fechado)** — para ativar, faça uma vez:
  1. No console do Firebase: **Cloud Messaging → aba "Configuração da Web"** →
     **Chave de aplicativo (VAPID) → Gerar chave**.
  2. Copie a chave e cole no campo `vapidKey` do `firebaseConfig` em `auth.js`
     (o valor fica dentro das aspas).
  3. É preciso servir por **HTTPS ou localhost** (o push não funciona em `http`).
  4. Para testar: console do Firebase → **Cloud Messaging → Criar campanha de
     teste** (ou envie uma primeira notificação) — quem abriu o app uma vez e
     permitiu a notificação recebe. O token de cada aparelho fica em
     `musical/tokens/<uid>`.
  Se `vapidKey` estiver vazio, o app continua funcionando com popups + alerta
  do navegador normalmente.

## Tema escuro

Ativável em *Meu Perfil → Preferências → Modo escuro* (fica salvo por usuário
em `preferencias`) e acompanha quem já escolheu, em qual página fizer login.

## Busca no cabeçalho

A caixa de busca do topo (nas páginas que não têm filtro interno) faz busca
global: tarefas, ensaios, músicas, eventos, notificações, integrantes, equipes
e personagens — levando à página ou ao detalhe correto.

## Anotações

- Sem `vapidKey`, o service worker é registrado mas não recebe push; é seguro.
- O app grava também em `localStorage` como fallback quando o Firebase está
  indisponível ou as regras negam a escrita.