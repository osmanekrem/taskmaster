export default function NotFound() {
    return (
        <div className="flex h-full flex-col w-full items-center justify-center gap-4">
            <h1 className="text-7xl font-black">404</h1>
            <p className="text-lg text-muted-foreground">
                Aradığınız sayfa bulunamadı.
            </p>
        </div>
    );
}