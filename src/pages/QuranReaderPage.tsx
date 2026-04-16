import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ChevronLeft, Play, Pause, Bookmark, GraduationCap } from "lucide-react";
import { fetchChapters, fetchVersesByChapter, searchQuran, getQuranComLink } from "@/lib/quran-api";
import type { Chapter, Verse } from "@/lib/quran-api";
import { saveBookmark, getBookmarks } from "@/lib/storage";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function QuranReaderPage() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Verse[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [page, setPage] = useState(1);
  const bookmarks = getBookmarks();

  useEffect(() => {
    fetchChapters().then(setChapters);
  }, []);

  const openChapter = async (ch: Chapter) => {
    setSelectedChapter(ch);
    setLoading(true);
    setPage(1);
    const v = await fetchVersesByChapter(ch.id, 1);
    setVerses(v);
    setLoading(false);
  };

  const loadMore = async () => {
    if (!selectedChapter) return;
    const nextPage = page + 1;
    setLoading(true);
    const v = await fetchVersesByChapter(selectedChapter.id, nextPage);
    if (v.length > 0) {
      setVerses((prev) => [...prev, ...v]);
      setPage(nextPage);
    }
    setLoading(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSelectedChapter(null);
    const results = await searchQuran(searchQuery);
    setSearchResults(results);
    setSearching(false);
  };

  const toggleAudio = (verse: Verse) => {
    if (playingKey === verse.verse_key && audio) {
      audio.pause();
      setPlayingKey(null);
      return;
    }
    if (audio) audio.pause();
    if (!verse.audio?.url) {
      toast.error("No audio available");
      return;
    }
    const a = new Audio(verse.audio.url);
    a.onended = () => setPlayingKey(null);
    a.play();
    setAudio(a);
    setPlayingKey(verse.verse_key);
  };

  const handleBookmark = (verseKey: string) => {
    if (bookmarks.some((b) => b.verseKey === verseKey)) {
      toast.info("Already bookmarked");
      return;
    }
    saveBookmark({ verseKey });
    toast.success("Verse bookmarked");
  };

  const renderVerseList = (verseList: Verse[]) => (
    <div className="space-y-3">
      {verseList.map((v) => (
        <Card key={v.verse_key} className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <a
                href={getQuranComLink(v.verse_key)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {v.verse_key}
              </a>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleAudio(v)}>
                  {playingKey === v.verse_key ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleBookmark(v.verse_key)}>
                  <Bookmark className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <p className="text-right text-lg leading-loose font-serif mb-2">{v.text_uthmani}</p>
            {v.translations?.[0] && (
              <p className="text-sm text-muted-foreground italic">{v.translations[0].text}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        {selectedChapter && (
          <Button variant="ghost" size="icon" onClick={() => { setSelectedChapter(null); setVerses([]); }}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
        <h1 className="text-2xl font-bold">
          {selectedChapter ? `${selectedChapter.id}. ${selectedChapter.name_simple}` : "Quran Reader"}
        </h1>
        {selectedChapter && (
          <span className="text-muted-foreground text-lg font-serif">{selectedChapter.name_arabic}</span>
        )}
      </div>

      {/* Search */}
      <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="flex gap-2">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search the Quran..."
          className="bg-card border-border"
        />
        <Button type="submit" size="icon" disabled={searching}>
          <Search className="h-4 w-4" />
        </Button>
      </form>

      {/* Search Results */}
      {searchResults.length > 0 && !selectedChapter && (
        <div>
          <h3 className="text-sm font-medium mb-3 text-muted-foreground">
            {searchResults.length} results for "{searchQuery}"
          </h3>
          {renderVerseList(searchResults)}
        </div>
      )}

      {/* Chapter List */}
      {!selectedChapter && searchResults.length === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {chapters.map((ch) => (
            <button
              key={ch.id}
              onClick={() => openChapter(ch)}
              className="flex items-center justify-between px-4 py-3 rounded-lg border border-border hover:bg-secondary transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-6">{ch.id}</span>
                <div>
                  <p className="text-sm font-medium">{ch.name_simple}</p>
                  <p className="text-xs text-muted-foreground">{ch.verses_count} verses · {ch.revelation_place}</p>
                </div>
              </div>
              <span className="text-lg font-serif">{ch.name_arabic}</span>
            </button>
          ))}
        </div>
      )}

      {/* Verses */}
      {selectedChapter && (
        <>
          {loading && verses.length === 0 ? (
            <div className="flex justify-center py-12">
              <div className="h-5 w-5 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {renderVerseList(verses)}
              {verses.length > 0 && (
                <div className="text-center py-4">
                  <Button variant="outline" onClick={loadMore} disabled={loading}>
                    {loading ? "Loading..." : "Load More"}
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
