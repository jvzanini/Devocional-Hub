<div align="center">

# 📖 Devocional Hub

### AI-Powered Devotional Management Platform

**Automate, organize, and enrich your daily devotionals with AI, Zoom integration, and Google NotebookLM.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma)](https://www.prisma.io/)
[![Docker](https://img.shields.io/badge/Docker-Swarm-2496ED?logo=docker)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-Private-red)]()

---

[English](#-overview) · [Português](#-visão-geral)

</div>

---

## 🌍 Overview

**Devocional Hub** is a full-stack platform that automatically processes Zoom devotional meetings into rich, AI-generated content. When a Zoom meeting ends, the system kicks off an intelligent pipeline that transforms raw transcriptions into summaries, Bible references, theological research, slides, infographics, and video overviews — all powered by AI.

### ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🎥 **Zoom Integration** | Automatic recording & transcript capture via Zoom API |
| 🤖 **AI Processing** | Multi-provider cascade (OpenAI → OpenRouter → Gemini) for transcript analysis |
| 📖 **Bible API** | Automatic NVI Bible text retrieval via API.Bible |
| 🧠 **NotebookLM Automation** | Playwright-driven automation to generate slides, infographics & video summaries |
| 📅 **Reading Plans** | Track daily Bible reading progress with smart sync |
| 👥 **Attendance Tracking** | Auto-match Zoom participants to platform users |
| 🔐 **Content Protection** | Password-protected documents extracted from meeting context |
| 📊 **Admin Dashboard** | Full admin panel with user management, webhooks, AI config & analytics |
| 📧 **Email Invites** | Invite new users via Gmail SMTP |
| 📆 **Calendar Integration** | iCalendar export for devotional schedules |

### 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Devocional Hub                         │
├──────────┬──────────┬──────────┬─────────┬──────────────┤
│  Zoom    │   AI     │  Bible   │ NLM     │  Email       │
│  API     │ Cascade  │  API     │ Automat.│  SMTP        │
├──────────┴──────────┴──────────┴─────────┴──────────────┤
│              Pipeline Orchestration                       │
├─────────────────────────────────────────────────────────┤
│         Next.js 16 (App Router + API Routes)             │
├─────────────────────────────────────────────────────────┤
│     Prisma ORM  │  PostgreSQL  │  Local Storage          │
├─────────────────────────────────────────────────────────┤
│  Docker Swarm  │  Traefik (SSL)  │  GitHub Actions CI/CD │
└─────────────────────────────────────────────────────────┘
```

### 🔄 Processing Pipeline

```
Zoom Meeting Ends → Webhook Trigger
       ↓
Fetch VTT Transcript
       ↓
AI Processing (Summary + Research)
       ↓
Bible Text Retrieval (NVI)
       ↓
Build Knowledge Base
       ↓
NotebookLM → Slides + Infographic + Video
       ↓
Save to DB + Storage
       ↓
Sync Attendance + Reading Plan
```

---

## 📁 Project Structure

```
src/
├── app/                              # 🛣️  Routing (Pages + API)
│   ├── (auth)/                       #     Login & Invite pages (no sidebar)
│   ├── (dashboard)/                  #     Authenticated pages (shared sidebar layout)
│   │   ├── layout.tsx                #     Sidebar + auth check
│   │   ├── page.tsx                  #     Dashboard (home)
│   │   ├── admin/page.tsx            #     Admin panel
│   │   ├── profile/page.tsx          #     User profile
│   │   └── session/[id]/page.tsx     #     Session details
│   ├── api/                          #     23 REST endpoints
│   ├── layout.tsx                    #     Root layout (font, dark mode script)
│   └── globals.css                   #     Design system (CSS vars + dark mode)
│
├── features/                         # 🧩 Business Domains
│   ├── auth/lib/                     #     NextAuth configuration
│   ├── sessions/                     #     Session management & attendance
│   │   ├── components/               #     AttendanceSection, ProtectedDocuments, etc.
│   │   └── lib/                      #     attendance-sync
│   ├── dashboard/components/         #     Calendar widget
│   ├── admin/components/             #     Pipeline trigger button
│   ├── bible/                        #     Bible text & book mapping
│   │   ├── components/               #     BibleBooksGrid
│   │   └── lib/                      #     API.Bible integration
│   ├── pipeline/lib/                 #     Core: AI, NotebookLM, reading-plan-sync
│   ├── zoom/lib/                     #     Zoom OAuth, recordings, participants
│   └── email/lib/                    #     Gmail SMTP
│
├── shared/                           # 🔗 Shared Utilities
│   ├── components/                   #     Sidebar, shared UI
│   │   ├── Sidebar.tsx               #     Navigation, theme toggle, logout
│   │   └── ui/                       #     Badge, UI primitives
│   └── lib/                          #     Database, storage, utils
│
└── middleware.ts                     # 🔒 Auth middleware
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript 5 |
| **UI** | React 19 + Tailwind CSS 4 + Dark Mode |
| **Database** | PostgreSQL 16 + Prisma 5 |
| **Auth** | NextAuth v5 (JWT) |
| **AI** | OpenAI + OpenRouter + Google Gemini |
| **Bible** | API.Bible (NVI) |
| **Automation** | Playwright (NotebookLM) |
| **Email** | Nodemailer (Gmail SMTP) |
| **Meetings** | Zoom Server-to-Server OAuth |
| **Infra** | Docker Swarm + Traefik + GHCR |
| **CI/CD** | GitHub Actions → Portainer |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 16
- Docker (optional, for production)

### Installation

```bash
# Clone the repository
git clone https://github.com/jvzanini/Devocional-Hub.git
cd Devocional-Hub

# Install dependencies
npm install --legacy-peer-deps

# Setup environment
cp .env.example .env
# Edit .env with your credentials

# Setup database
npx prisma db push
npx prisma db seed

# Start development server
npm run dev
```

### 🐳 Docker (Production)

```bash
# Build and run with Docker Compose
docker compose -f docker-compose.prod.yml up -d
```

---

## 📋 Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/devocional_hub

# Auth
NEXTAUTH_SECRET=your-secret
NEXTAUTH_URL=https://your-domain.com

# Zoom
ZOOM_ACCOUNT_ID=
ZOOM_CLIENT_ID=
ZOOM_CLIENT_SECRET=

# AI Providers
OPENAI_API_KEY=
OPENROUTER_API_KEY=
GEMINI_API_KEY=

# Bible
BIBLE_API_KEY=
BIBLE_NVI_ID=a556c5305ee15c3f-01

# Google (NotebookLM)
GOOGLE_EMAIL=
GOOGLE_PASSWORD=
```

---

## 🤖 AI Cascade

The system uses an intelligent fallback chain to ensure reliability:

1. **OpenAI** (configurable model, default: `gpt-4.1-mini`)
2. **Nemotron 120B** via OpenRouter (free)
3. **Step 3.5 Flash** via OpenRouter (free)
4. **Nemotron 30B** via OpenRouter (free)
5. **Gemini 2.5 Flash** via Google API (free)

> The primary model can be changed from the admin panel without redeployment.

---

<div align="center">

---

# 📖 Devocional Hub

### Plataforma de Gestão de Devocionais com IA

</div>

## 🌎 Visão Geral

**Devocional Hub** é uma plataforma full-stack que processa automaticamente reuniões devocionais do Zoom em conteúdo rico gerado por IA. Quando uma reunião termina, o sistema inicia um pipeline inteligente que transforma transcrições em resumos, referências bíblicas, pesquisas teológicas, slides, infográficos e vídeos resumo — tudo impulsionado por IA.

### ✨ Funcionalidades Principais

| Funcionalidade | Descrição |
|----------------|-----------|
| 🎥 **Integração Zoom** | Captura automática de gravações e transcrições via API do Zoom |
| 🤖 **Processamento com IA** | Cascata multi-provedor (OpenAI → OpenRouter → Gemini) |
| 📖 **API Bíblica** | Busca automática de textos NVI via API.Bible |
| 🧠 **Automação NotebookLM** | Geração automática de slides, infográficos e vídeos resumo |
| 📅 **Planos de Leitura** | Acompanhamento diário do progresso de leitura bíblica |
| 👥 **Controle de Presença** | Correlação automática entre participantes Zoom e usuários |
| 🔐 **Proteção de Conteúdo** | Documentos protegidos por senha extraída do contexto da reunião |
| 📊 **Painel Admin** | Gestão completa de usuários, webhooks, IA e analytics |
| 📧 **Convites por Email** | Sistema de convites via Gmail SMTP |
| 📆 **Integração com Calendário** | Exportação iCalendar para agenda de devocionais |

### 🔄 Pipeline de Processamento

```
Reunião Zoom Encerra → Webhook Acionado
       ↓
Busca Transcrição VTT
       ↓
Processamento com IA (Resumo + Pesquisa Teológica)
       ↓
Busca Texto Bíblico (NVI)
       ↓
Construção da Base de Conhecimento
       ↓
NotebookLM → Slides + Infográfico + Vídeo Resumo
       ↓
Salva no Banco + Storage
       ↓
Sincroniza Presença + Plano de Leitura
```

---

## 🚀 Como Começar

### Pré-requisitos

- Node.js 20+
- PostgreSQL 16
- Docker (opcional, para produção)

### Instalação

```bash
# Clone o repositório
git clone https://github.com/jvzanini/Devocional-Hub.git
cd Devocional-Hub

# Instale as dependências
npm install --legacy-peer-deps

# Configure o ambiente
cp .env.example .env
# Edite o .env com suas credenciais

# Configure o banco de dados
npx prisma db push
npx prisma db seed

# Inicie o servidor de desenvolvimento
npm run dev
```

### 🐳 Docker (Produção)

```bash
# Build e execução com Docker Compose
docker compose -f docker-compose.prod.yml up -d
```

---

## 📊 Métricas do Projeto

| Métrica | Valor |
|---------|-------|
| Arquivos TypeScript | 54 |
| API Endpoints | 23 |
| Páginas | 6 |
| Componentes React | 10 |
| Modelos Prisma | 10 |
| Features | 8 |

---

## 🏗️ Infraestrutura

- **Domínio**: devocional.nexusai360.com (Cloudflare DNS)
- **Container**: Docker Swarm via Portainer
- **Proxy Reverso**: Traefik + Let's Encrypt SSL + HSTS
- **Registry**: ghcr.io (GitHub Container Registry)
- **CI/CD**: GitHub Actions → Build Docker → Deploy Portainer

---

<div align="center">

**Built with ❤️ and ☕ for the devotional community**

*Construído com ❤️ e ☕ para a comunidade devocional*

</div>
