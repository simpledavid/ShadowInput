const FEATURES = [
  {
    title: "悬停即查词",
    desc: "鼠标停在单词上，视频自动暂停并弹出释义，移开自动继续播放。",
    tag: "Hover to pause",
  },
  {
    title: "双语字幕对照",
    desc: "英文字幕下方直接显示中文字幕，跟读、理解和记忆更连贯。",
    tag: "EN + 中文",
  },
  {
    title: "生词收藏导出",
    desc: "一键收藏生词，后续可在扩展里统一复习并导出。",
    tag: "Flashcards",
  },
];

const STEPS = [
  "下载插件 ZIP 并解压到本地目录。",
  "打开 chrome://extensions 或 edge://extensions。",
  "开启开发者模式，点击“加载已解压的扩展程序”，选择目录即可。",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#060a16] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_14%_0%,rgba(76,130,255,0.22),transparent_42%),radial-gradient(circle_at_82%_18%,rgba(0,229,255,0.14),transparent_40%),radial-gradient(circle_at_74%_84%,rgba(255,75,220,0.12),transparent_38%)]" />

      <div className="relative mx-auto w-[min(1120px,92vw)] py-6 md:py-8">
        <header className="flex items-center justify-between rounded-xl border border-cyan-200/20 bg-[#0c1224]/70 px-4 py-3 backdrop-blur md:px-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg border border-cyan-200/60 bg-gradient-to-br from-cyan-300/35 via-blue-500/35 to-fuchsia-400/35 text-xl font-black text-cyan-100">
              S
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide text-zinc-100">ShadowInput</p>
              <p className="text-xs text-cyan-100/70">YouTube 字幕学习插件</p>
            </div>
          </div>

          <a
            href="/downloads/shadowinput-extension.zip"
            download
            className="rounded-lg border border-cyan-200/45 bg-cyan-400/15 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/25"
          >
            下载插件
          </a>
        </header>

        <section className="mt-6 grid gap-5 md:mt-8 md:grid-cols-[1.2fr_1fr]">
          <article className="rounded-2xl border border-cyan-200/20 bg-[#0d1429]/85 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.45)] md:p-8">
            <p className="inline-flex rounded-full border border-fuchsia-300/40 bg-fuchsia-400/10 px-3 py-1 text-xs font-semibold tracking-wide text-fuchsia-100/90">
              Cyber Learning Mode
            </p>
            <h1 className="mt-4 text-3xl font-extrabold leading-tight md:text-5xl">
              看 YouTube 的同时
              <br />
              更快学会英语字幕
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-200/88 md:text-base">
              参考 Trancy 的官网信息结构，ShadowInput 把“看视频 + 学语言”做成一个连续流程：
              看到不会的词直接停住查，字幕双语对照，生词即时收藏，不打断观看节奏。
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="/downloads/shadowinput-extension.zip"
                download
                className="rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-2.5 text-sm font-semibold text-[#071024] transition hover:from-cyan-300 hover:to-blue-400"
              >
                立即下载 ZIP
              </a>
              <a
                href="#install"
                className="rounded-lg border border-cyan-200/35 bg-cyan-300/10 px-5 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
              >
                查看安装步骤
              </a>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <span className="rounded-md border border-zinc-700/80 bg-zinc-900/80 px-2.5 py-1 text-xs text-zinc-300">
                Chrome
              </span>
              <span className="rounded-md border border-zinc-700/80 bg-zinc-900/80 px-2.5 py-1 text-xs text-zinc-300">
                Edge
              </span>
              <span className="rounded-md border border-zinc-700/80 bg-zinc-900/80 px-2.5 py-1 text-xs text-zinc-300">
                Manifest V3
              </span>
            </div>
          </article>

          <article className="rounded-2xl border border-cyan-200/20 bg-[#0d1429]/85 p-5 md:p-6">
            <div className="rounded-xl border border-cyan-300/25 bg-[#0a1022] p-4">
              <p className="text-xs text-cyan-100/75">实时体验</p>
              <p className="mt-2 text-lg font-semibold">字幕悬停暂停 + 双语显示</p>
              <div className="mt-4 space-y-2">
                <div className="rounded-lg border border-zinc-700/80 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-200">
                  even the UK wasn’t this cold.
                </div>
                <div className="rounded-lg border border-cyan-300/30 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-100">
                  即使在英国，也没这么冷。
                </div>
              </div>
              <div className="mt-4 h-px bg-gradient-to-r from-transparent via-cyan-200/30 to-transparent" />
              <p className="mt-3 text-xs leading-6 text-zinc-300/85">
                悬停单词可直接暂停视频并查词，点击心形收藏到生词本。
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-3">
                <p className="text-xs text-cyan-100/70">核心场景</p>
                <p className="mt-1 text-sm font-semibold">看视频学英语</p>
              </div>
              <div className="rounded-lg border border-fuchsia-300/20 bg-fuchsia-300/10 p-3">
                <p className="text-xs text-fuchsia-100/70">学习闭环</p>
                <p className="mt-1 text-sm font-semibold">查词到复习</p>
              </div>
            </div>
          </article>
        </section>

        <section className="mt-5 grid gap-4 md:mt-6 md:grid-cols-3">
          {FEATURES.map((item) => (
            <article
              key={item.title}
              className="rounded-xl border border-cyan-200/18 bg-[#0d1429]/80 p-5"
            >
              <p className="text-xs font-semibold tracking-wide text-cyan-100/75">{item.tag}</p>
              <h2 className="mt-2 text-lg font-semibold">{item.title}</h2>
              <p className="mt-2 text-sm leading-7 text-zinc-300/90">{item.desc}</p>
            </article>
          ))}
        </section>

        <section id="install" className="mt-5 rounded-2xl border border-cyan-200/18 bg-[#0d1429]/82 p-6 md:mt-6 md:p-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-2xl font-bold">安装只要 3 步</h2>
            <a
              href="/downloads/shadowinput-extension.zip"
              download
              className="rounded-lg border border-fuchsia-300/45 bg-fuchsia-300/12 px-4 py-2 text-sm font-semibold text-fuchsia-100 transition hover:bg-fuchsia-300/20"
            >
              再次下载插件
            </a>
          </div>
          <ol className="mt-4 space-y-3">
            {STEPS.map((step, idx) => (
              <li key={step} className="flex items-start gap-3 rounded-lg border border-zinc-700/60 bg-zinc-900/55 px-4 py-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-400/20 text-xs font-bold text-cyan-100">
                  {idx + 1}
                </span>
                <span className="text-sm text-zinc-200/90">{step}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  );
}
