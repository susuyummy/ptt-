import tkinter as tk
from tkinter import ttk, messagebox
import json
from ptt_dcard_crawler import PTTDcardCrawler
from utils.word_counter import count_keywords, get_word_frequency_stats
import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
import matplotlib.font_manager as fm
import os

# 設定中文字體
plt.rcParams['font.sans-serif'] = ['Arial Unicode MS', 'Microsoft JhengHei', 'SimHei', 'sans-serif']
plt.rcParams['axes.unicode_minus'] = False  # 用來正常顯示負號

class WordFreqAnalyzerGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("PTT/Dcard 詞頻分析器")
        self.root.geometry("800x600")
        
        # 初始化爬蟲
        self.crawler = PTTDcardCrawler()
        
        # 建立主框架
        self.main_frame = ttk.Frame(root, padding="10")
        self.main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # 建立控制區域
        self.create_control_panel()
        
        # 建立結果顯示區域
        self.create_result_panel()
        
        # 設定網格權重
        root.columnconfigure(0, weight=1)
        root.rowconfigure(0, weight=1)
        self.main_frame.columnconfigure(1, weight=1)
        self.main_frame.rowconfigure(1, weight=1)
    
    def create_control_panel(self):
        """建立控制面板"""
        control_frame = ttk.LabelFrame(self.main_frame, text="控制面板", padding="5")
        control_frame.grid(row=0, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=5)
        
        # 來源選擇
        ttk.Label(control_frame, text="來源:").grid(row=0, column=0, padx=5)
        self.source_var = tk.StringVar(value="ptt")
        ttk.Radiobutton(control_frame, text="PTT", variable=self.source_var, value="ptt").grid(row=0, column=1)
        ttk.Radiobutton(control_frame, text="Dcard", variable=self.source_var, value="dcard").grid(row=0, column=2)
        
        # 看板輸入
        ttk.Label(control_frame, text="看板:").grid(row=1, column=0, padx=5, pady=5)
        self.board_var = tk.StringVar(value="Gossiping")
        self.board_entry = ttk.Entry(control_frame, textvariable=self.board_var)
        self.board_entry.grid(row=1, column=1, columnspan=2, sticky=(tk.W, tk.E), padx=5)
        
        # 頁數選擇
        ttk.Label(control_frame, text="頁數:").grid(row=2, column=0, padx=5, pady=5)
        self.pages_var = tk.StringVar(value="1")
        self.pages_spinbox = ttk.Spinbox(control_frame, from_=1, to=10, textvariable=self.pages_var, width=5)
        self.pages_spinbox.grid(row=2, column=1, sticky=tk.W, padx=5)
        
        # 分析按鈕
        self.analyze_btn = ttk.Button(control_frame, text="分析", command=self.analyze)
        self.analyze_btn.grid(row=2, column=2, padx=5)
    
    def create_result_panel(self):
        """建立結果顯示面板"""
        result_frame = ttk.LabelFrame(self.main_frame, text="分析結果", padding="5")
        result_frame.grid(row=1, column=0, columnspan=2, sticky=(tk.W, tk.E, tk.N, tk.S), pady=5)
        
        # 建立分頁
        self.notebook = ttk.Notebook(result_frame)
        self.notebook.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # 文字結果分頁
        self.text_frame = ttk.Frame(self.notebook)
        self.notebook.add(self.text_frame, text="文字結果")
        
        self.result_text = tk.Text(self.text_frame, wrap=tk.WORD, height=10)
        self.result_text.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # 圖表分頁
        self.chart_frame = ttk.Frame(self.notebook)
        self.notebook.add(self.chart_frame, text="圖表")
        
        # 設定網格權重
        result_frame.columnconfigure(0, weight=1)
        result_frame.rowconfigure(0, weight=1)
        self.text_frame.columnconfigure(0, weight=1)
        self.text_frame.rowconfigure(0, weight=1)
        self.chart_frame.columnconfigure(0, weight=1)
        self.chart_frame.rowconfigure(0, weight=1)
    
    def analyze(self):
        """執行分析"""
        try:
            # 清空結果
            self.result_text.delete(1.0, tk.END)
            
            # 獲取參數
            source = self.source_var.get()
            board = self.board_var.get()
            pages = int(self.pages_var.get())
            
            # 顯示進度
            self.result_text.insert(tk.END, f"正在分析 {source} {board} 板的文章...\n")
            self.root.update()
            
            # 獲取文章
            articles = self.crawler.fetch_articles(source=source, board=board, pages=pages)
            
            if not articles:
                messagebox.showwarning("警告", "沒有找到任何文章")
                return
            
            # 合併所有文章內容
            all_text = " ".join(article['content'] for article in articles)
            
            # 分析詞頻
            stats = get_word_frequency_stats(all_text)
            
            # 顯示結果
            self.result_text.insert(tk.END, f"\n總字數: {stats['total_words']}\n")
            self.result_text.insert(tk.END, f"不重複詞數: {stats['unique_words']}\n\n")
            self.result_text.insert(tk.END, "熱門關鍵詞:\n")
            
            for word, freq in stats['top_keywords']:
                self.result_text.insert(tk.END, f"{word}: {freq}\n")
            
            # 繪製圖表
            self.plot_word_frequency(stats['top_keywords'])
            
        except Exception as e:
            messagebox.showerror("錯誤", f"分析時發生錯誤: {str(e)}")
    
    def plot_word_frequency(self, word_freq):
        """繪製詞頻圖表"""
        # 清除舊圖表
        for widget in self.chart_frame.winfo_children():
            widget.destroy()
        
        # 準備數據
        words = [item[0] for item in word_freq]
        freqs = [item[1] for item in word_freq]
        
        # 建立圖表
        fig, ax = plt.subplots(figsize=(8, 4))
        ax.barh(words, freqs)
        ax.set_xlabel('頻率')
        ax.set_title('熱門關鍵詞頻率分布')
        
        # 將圖表加入GUI
        canvas = FigureCanvasTkAgg(fig, master=self.chart_frame)
        canvas.draw()
        canvas.get_tk_widget().grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))

def main():
    root = tk.Tk()
    app = WordFreqAnalyzerGUI(root)
    root.mainloop()

if __name__ == "__main__":
    main() 