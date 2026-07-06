"use client";

export default function LoginScreen() {
  const slackAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${process.env.NEXT_PUBLIC_SLACK_CLIENT_ID}&scope=&user_scope=identity.basic,identity.email&redirect_uri=${encodeURIComponent(process.env.NEXT_PUBLIC_APP_URL + "/api/auth/slack/callback")}`;

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-8 max-w-md w-full">
        {/* Logo / Title */}
        <div className="space-y-3">
          <div className="text-7xl">🎨</div>
          <h1 className="text-5xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
            WW Let&apos;s Doodle
          </h1>
          <p className="text-white/60 text-lg">
            Wiom Wednesday Activity &mdash; Draw. Vote. Win.
          </p>
        </div>

        {/* Info pills */}
        <div className="flex flex-wrap justify-center gap-2">
          {["3 Surprise Prompts", "2 Min Per Doodle", "Vote for the Best", "Top 3 Win Goodies"].map((t) => (
            <span key={t} className="px-3 py-1 bg-white/10 rounded-full text-sm text-white/70 border border-white/10">
              {t}
            </span>
          ))}
        </div>

        {/* Login button */}
        <a
          href={slackAuthUrl}
          className="flex items-center justify-center gap-3 w-full py-4 bg-[#4A154B] hover:bg-[#611f69] text-white font-bold rounded-2xl transition-all shadow-xl text-lg border border-purple-700/50"
        >
          <svg width="24" height="24" viewBox="0 0 54 54" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19.712.133a5.381 5.381 0 0 0-5.376 5.387 5.381 5.381 0 0 0 5.376 5.386h5.376V5.52A5.381 5.381 0 0 0 19.712.133m0 14.365H5.376A5.381 5.381 0 0 0 0 19.884a5.381 5.381 0 0 0 5.376 5.387h14.336a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386" fill="#36C5F0"/>
            <path d="M53.76 19.884a5.381 5.381 0 0 0-5.376-5.386 5.381 5.381 0 0 0-5.376 5.386v5.387h5.376a5.381 5.381 0 0 0 5.376-5.387m-14.336 0V5.52A5.381 5.381 0 0 0 34.048.133a5.381 5.381 0 0 0-5.376 5.387v14.364a5.381 5.381 0 0 0 5.376 5.387 5.381 5.381 0 0 0 5.376-5.387" fill="#2EB67D"/>
            <path d="M34.048 54a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386h-5.376v5.386A5.381 5.381 0 0 0 34.048 54m0-14.365h14.336a5.381 5.381 0 0 0 5.376-5.386 5.381 5.381 0 0 0-5.376-5.387H34.048a5.381 5.381 0 0 0-5.376 5.387 5.381 5.381 0 0 0 5.376 5.386" fill="#ECB22E"/>
            <path d="M0 34.249a5.381 5.381 0 0 0 5.376 5.386 5.381 5.381 0 0 0 5.376-5.386v-5.387H5.376A5.381 5.381 0 0 0 0 34.249m14.336 0v14.364A5.381 5.381 0 0 0 19.712 54a5.381 5.381 0 0 0 5.376-5.387V34.249a5.381 5.381 0 0 0-5.376-5.387 5.381 5.381 0 0 0-5.376 5.387" fill="#E01E5A"/>
          </svg>
          Login with Slack
        </a>

        <p className="text-white/30 text-xs">
          Only Wiom employees can access this portal
        </p>
      </div>
    </div>
  );
}
