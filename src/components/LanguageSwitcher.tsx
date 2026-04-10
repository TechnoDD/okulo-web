import { getLocale, locales, setLocale } from '@/paraglide/runtime'

export function LanguageSwitcher() {
    return (
        <div className="flex gap-2">
            {locales.map((locale) => (
                <button
                    key={locale}
                    onClick={() => setLocale(locale)}
                    className={`px-3 py-1 rounded border ${locale === getLocale()
                        ? 'bg-blue-500 text-white border-blue-600'
                        : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                        }`}
                >
                    {locale.toUpperCase()}
                </button>
            ))}
        </div>
    )
}
