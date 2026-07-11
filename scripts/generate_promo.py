import os
import sys
from PIL import Image, ImageDraw, ImageFont
from gtts import gTTS
import subprocess

# Define base settings
width, height = 1920, 1080
fps = 30
output_dir = r"d:\Projects\AI_interview\public\lander_page"
os.makedirs(output_dir, exist_ok=True)

# Image paths
img_dir = r"d:\Projects\AI_interview\public\landing_images"
screenshots = [
    ("Screenshot_11-7-2026_13541_localhost (1).jpeg", "Welcome to Prewise", "Your ultimate guide to acing coding interviews."),
    ("Screenshot_11-7-2026_135942_localhost (1).jpeg", "AI & Human Mock Interviews", "Adaptive AI scoring across communication, structure, and depth."),
    ("Screenshot_11-7-2026_135243_localhost (1).jpeg", "Opportunities Hub", "Find and apply to matching jobs and internships instantly."),
    ("Screenshot_11-7-2026_14044_localhost (1).jpeg", "ATS Resume Round", "Test your resume match rate against job descriptions."),
    ("Screenshot_11-7-2026_135616_localhost (1).jpeg", "Tailored Mock Tests", "Customize questions, timers, and test formats."),
    ("Screenshot_11-7-2026_1451_localhost (1).jpeg", "Daily DSA Challenges", "Solve problems daily to build streaks and master concepts.")
]

# Audio scripts
scripts = [
    "Welcome to Prewise, the career platform that gets you hired.",
    "Practice technical and HR rounds with our 24 7 adaptive AI interviewer or collaborate with friends.",
    "Explore matching jobs and internships from top tech companies.",
    "Upload your resume to check compatibility and ATS scoring against job descriptions.",
    "Customize practice tests and mock rounds focused on your target roles.",
    "Unlock your career today. Sign up free and get hired with Prewise."
]

def make_frames():
    print("Generating slides and audio...")
    temp_frames = []
    temp_audios = []
    
    # Try using system font
    try:
        title_font = ImageFont.truetype("arialbd.ttf", 64)
        sub_font = ImageFont.truetype("arial.ttf", 36)
    except IOError:
        title_font = ImageFont.load_default()
        sub_font = ImageFont.load_default()

    for idx, (filename, title, desc) in enumerate(screenshots):
        img_path = os.path.join(img_dir, filename)
        
        # 1. Generate Voiceover
        tts = gTTS(text=scripts[idx], lang='en')
        audio_path = os.path.join(output_dir, f"audio_{idx}.mp3")
        tts.save(audio_path)
        temp_audios.append(audio_path)
        
        # 2. Get Audio Duration
        # Default fallback to 5s if probe fails
        dur = 5.0
        try:
            cmd = f'ffprobe -i "{audio_path}" -show_entries format=duration -v quiet -of csv="p=0"'
            res = subprocess.check_output(cmd, shell=True).decode().strip()
            dur = float(res)
        except Exception:
            pass
        
        # 3. Create high aesthetic slides
        slide = Image.new("RGBA", (width, height), (7, 7, 10, 255)) # Dark premium theme
        draw = ImageDraw.Draw(slide)
        
        # Draw background radial ambient glow
        for r in range(500, 0, -25):
            alpha = int((1 - r/500) * 16)
            draw.ellipse((width//2 - r, height//2 - r, width//2 + r, height//2 + r), fill=(139, 92, 246, alpha))
            
        # Composite screenshot in a mockup browser frame
        if os.path.exists(img_path):
            screenshot = Image.open(img_path).convert("RGBA")
            # Scale to fit center-right cleanly
            ss_w = 1100
            scale = ss_w / screenshot.width
            ss_h = int(screenshot.height * scale)
            screenshot = screenshot.resize((ss_w, ss_h), Image.Resampling.LANCZOS)
            
            # Draw frame shadow / background card
            card_x = width - ss_w - 60
            card_y = (height - ss_h) // 2
            draw.rounded_rectangle((card_x - 10, card_y - 40, card_x + ss_w + 10, card_y + ss_h + 10), radius=16, fill=(25, 25, 34, 255), outline=(38, 38, 47, 255), width=2)
            # Browser dots
            draw.ellipse((card_x + 10, card_y - 28, card_x + 20, card_y - 18), fill=(255, 95, 87, 255))
            draw.ellipse((card_x + 26, card_y - 28, card_x + 36, card_y - 18), fill=(254, 188, 46, 255))
            draw.ellipse((card_x + 42, card_y - 28, card_x + 52, card_y - 18), fill=(40, 200, 64, 255))
            
            slide.paste(screenshot, (card_x, card_y), screenshot)

        # Draw typography text card (Left side)
        draw.text((80, height//2 - 120), title, fill=(124, 255, 196, 255), font=title_font) # Mint color title
        # Word wrap desc
        words = desc.split(' ')
        lines = []
        cur_line = []
        for w in words:
            if len(' '.join(cur_line + [w])) * 10 > 600:
                lines.append(' '.join(cur_line))
                cur_line = [w]
            else:
                cur_line.append(w)
        lines.append(' '.join(cur_line))
        
        y_offset = height//2 - 20
        for line in lines:
            draw.text((80, y_offset), line, fill=(244, 243, 249, 255), font=sub_font)
            y_offset += 50
            
        slide_path = os.path.join(output_dir, f"slide_{idx}.png")
        slide.convert("RGB").save(slide_path, "PNG")
        temp_frames.append((slide_path, dur))
        
    return temp_frames, temp_audios

def compile_video(frames, audios):
    print("Compiling video tracks with ffmpeg...")
    concat_file = os.path.join(output_dir, "concat.txt")
    
    with open(concat_file, "w") as f:
        for slide_path, duration in frames:
            f.write(f"file '{slide_path.replace(os.sep, '/')}'\n")
            f.write(f"duration {duration}\n")
        # Repeat last slide to enforce duration writing
        f.write(f"file '{frames[-1][0].replace(os.sep, '/')}'\n")

    # Combine Audios
    audio_concat = os.path.join(output_dir, "audio_concat.txt")
    with open(audio_concat, "w") as f:
        for audio_path in audios:
            f.write(f"file '{audio_path.replace(os.sep, '/')}'\n")
            
    combined_audio = os.path.join(output_dir, "combined_audio.mp3")
    cmd_audio = f'ffmpeg -y -f concat -safe 0 -i "{audio_concat}" -c copy "{combined_audio}"'
    subprocess.call(cmd_audio, shell=True)
    
    # Render final high aesthetic MP4
    final_video = os.path.join(output_dir, "promo.mp4")
    cmd_video = f'ffmpeg -y -f concat -safe 0 -i "{concat_file}" -i "{combined_audio}" -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest "{final_video}"'
    subprocess.call(cmd_video, shell=True)
    
    print(f"Video generated successfully at: {final_video}")
    
    # Cleanup temp slides/audios
    for slide_path, _ in frames:
        if os.path.exists(slide_path): os.remove(slide_path)
    for audio_path in audios:
        if os.path.exists(audio_path): os.remove(audio_path)
    if os.path.exists(concat_file): os.remove(concat_file)
    if os.path.exists(audio_concat): os.remove(audio_concat)
    if os.path.exists(combined_audio): os.remove(combined_audio)

if __name__ == "__main__":
    frames, audios = make_frames()
    compile_video(frames, audios)
