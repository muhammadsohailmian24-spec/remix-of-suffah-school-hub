import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GalleryImage {
  id: string;
  image_url: string;
  description: string | null;
  display_order: number;
}

const Gallery = () => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchGallery();
  }, []);

  const fetchGallery = async () => {
    const { data, error } = await supabase
      .from("gallery")
      .select("*")
      .eq("is_visible", true)
      .order("display_order", { ascending: true });

    if (!error && data) {
      setImages(data);
    }
    setLoading(false);
  };

  const handlePrevious = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const handleNext = () => {
    if (selectedIndex !== null && selectedIndex < images.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  if (loading) {
    return (
      <div className="py-20">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-square bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return null;
  }

  return (
    <section id="gallery" className="py-20 bg-accent/30">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">Our Gallery</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Take a glimpse into life at The Suffah - our facilities, events, and achievements
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <div
              key={image.id}
              className="group relative aspect-square overflow-hidden rounded-lg cursor-pointer animate-scale-in"
              style={{ animationDelay: `${index * 0.05}s` }}
              onClick={() => setSelectedIndex(index)}
            >
              <img
                src={image.image_url}
                alt={image.description || "Gallery image"}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                {image.description && (
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="text-background text-sm font-medium line-clamp-2">
                      {image.description}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox Dialog */}
      <Dialog open={selectedIndex !== null} onOpenChange={() => setSelectedIndex(null)}>
        <DialogContent className="max-w-4xl p-0 bg-foreground/95 border-none">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 z-10 text-background hover:bg-background/20"
            onClick={() => setSelectedIndex(null)}
          >
            <X className="h-5 w-5" />
          </Button>

          {selectedIndex !== null && images[selectedIndex] && (
            <div className="relative">
              <img
                src={images[selectedIndex].image_url}
                alt={images[selectedIndex].description || "Gallery image"}
                className="w-full max-h-[80vh] object-contain"
              />

              {images[selectedIndex].description && (
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-foreground/80 to-transparent">
                  <p className="text-background text-center">{images[selectedIndex].description}</p>
                </div>
              )}

              {selectedIndex > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-background hover:bg-background/20"
                  onClick={handlePrevious}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
              )}

              {selectedIndex < images.length - 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-background hover:bg-background/20"
                  onClick={handleNext}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default Gallery;
