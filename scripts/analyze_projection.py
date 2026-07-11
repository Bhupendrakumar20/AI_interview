from PIL import Image
import numpy as np

def analyze_horizontal_projection():
    img = Image.open('Landing_images/logo.png')
    gray = img.convert('L')
    arr = np.array(gray)
    
    # Calculate row brightness (mean value per row)
    row_means = np.mean(arr, axis=1)
    
    # Print the row means at intervals to see where text/logo starts and ends
    print("Row means shape:", row_means.shape)
    
    # Let's find rows that are dark (background)
    dark_rows = np.where(row_means < 15)[0]
    print("Number of dark rows:", len(dark_rows))
    
    # Detect transitions
    non_dark = np.where(row_means >= 15)[0]
    if len(non_dark) > 0:
        print("Non-dark range:", non_dark[0], "to", non_dark[-1])
        
        # Let's look for gaps of dark rows inside the non-dark range
        gaps = []
        in_gap = False
        gap_start = 0
        for i in range(non_dark[0], non_dark[-1]):
            if row_means[i] < 15:
                if not in_gap:
                    in_gap = True
                    gap_start = i
            else:
                if in_gap:
                    in_gap = False
                    gaps.append((gap_start, i))
        print("Detected gaps inside logo:", gaps)

if __name__ == '__main__':
    analyze_horizontal_projection()
