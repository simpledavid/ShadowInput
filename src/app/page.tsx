export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_15%_-10%,#243a7a_0%,#0b1020_40%,#070b16_100%)] text-zinc-100">
      <section className="mx-auto w-[min(980px,92vw)] py-12 md:py-16">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8 shadow-[0_18px_44px_rgba(0,0,0,0.35)]">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-2xl font-bold">
              S
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">ShadowInput</h1>
              <p className="mt-1 text-sm text-blue-100/80 md:text-base">
                YouTube 字幕学习插件
              </p>
            </div>
          </div>

          <p className="mt-5 max-w-2xl text-zinc-200/90">
            支持悬停暂停查词、英文下方中文字幕双语显示、生词收藏导出。打开视频即学，不打断观看节奏。
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              className="rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-400"
              href="/downloads/shadowinput-extension.zip"
              download
            >
              下载插件 ZIP
            </a>
            <a
              className="rounded-lg border border-blue-200/30 bg-blue-900/20 px-5 py-2.5 text-sm font-semibold text-blue-100 transition hover:bg-blue-800/30"
              href="#install"
            >
              安装步骤
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-[min(980px,92vw)] gap-4 pb-12 md:grid-cols-2 md:pb-16">
        <article className="rounded-2xl border border-white/10 bg-[#111a34]/85 p-6">
          <h2 className="text-lg font-semibold">核心功能</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-zinc-200/90">
            <li>悬停单词自动暂停，移开后自动恢复播放。</li>
            <li>英文字幕下方显示中文字幕，双语对照更直观。</li>
            <li>一键收藏生词，支持后续复习导出。</li>
          </ul>
        </article>

        <article id="install" className="rounded-2xl border border-white/10 bg-[#111a34]/85 p-6">
          <h2 className="text-lg font-semibold">安装步骤（Chrome / Edge）</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-zinc-200/90">
            <li>先下载上面的 ZIP 压缩包并解压。</li>
            <li>打开 `chrome://extensions` 或 `edge://extensions`。</li>
            <li>开启开发者模式，点击“加载已解压的扩展程序”。</li>
            <li>选择解压后的目录，完成安装。</li>
          </ol>
        </article>
      </section>
    </main>
  );
}
