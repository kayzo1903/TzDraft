import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { Ghost, Home, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export function GameNotFound() {
    return (
        <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
            <Card className="w-full max-w-md border-[var(--secondary-border)] bg-[var(--secondary)]/50 backdrop-blur-sm shadow-2xl">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto bg-[var(--primary)]/10 p-4 rounded-full w-fit mb-4 border border-[var(--primary)]/20">
                        <Ghost className="w-12 h-12 text-[var(--primary)]" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-[var(--foreground)]">
                        Game Not Found
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-4 pt-4">
                    <div className="flex items-center justify-center gap-2 text-neutral-400 bg-neutral-900/50 p-3 rounded-lg border border-neutral-800">
                        <AlertCircle className="w-5 h-5 text-neutral-500" />
                        <p className="text-sm">This game ID does not exist or has expired.</p>
                    </div>
                    <p className="text-neutral-500 text-sm">
                        Check the URL or return home to start a new match.
                    </p>
                </CardContent>
                <CardFooter className="flex flex-col gap-3 pt-6">
                    <Button asChild className="w-full gap-2">
                        <Link href="/game/online">
                            <Ghost className="w-4 h-4" />
                            Start New Game
                        </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full border-neutral-700 hover:bg-neutral-800 text-neutral-300">
                        <Link href="/" className="flex items-center gap-2">
                            <Home className="w-4 h-4" />
                            Return Home
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
