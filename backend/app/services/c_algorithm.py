import ctypes
import json
import os
from typing import Optional, Dict, Any, List
from pathlib import Path

from app.config import settings


class CAlgorithm:
    """C 算法封装类"""
    
    def __init__(self, lib_path: Optional[str] = None):
        if lib_path is None:
            lib_path = settings.C_LIB_PATH
        
        if not os.path.exists(lib_path):
            raise FileNotFoundError(f"C 动态库不存在: {lib_path}")
        
        self.lib = ctypes.CDLL(lib_path)
        self._setup_functions()
    
    def _setup_functions(self):
        """设置函数签名"""
        # 回调函数类型
        # void callback(int step, char* message, int progress, int error_code, char* error_msg, char* data, int current, int total)
        self.CALLBACK_TYPE = ctypes.CFUNCTYPE(
            None,
            ctypes.c_int,
            ctypes.c_char_p,
            ctypes.c_int,
            ctypes.c_int,
            ctypes.c_char_p,
            ctypes.c_char_p,
            ctypes.c_int,
            ctypes.c_int
        )
        
        # process_images 函数
        # char* process_images(const char** image_paths, int count, const char* output_dir, ProgressCallback callback)
        self.lib.process_images.argtypes = [
            ctypes.POINTER(ctypes.c_char_p),  # 字符串数组
            ctypes.c_int,                      # 数量
            ctypes.c_char_p,                   # 输出目录
            self.CALLBACK_TYPE                 # 回调
        ]
        self.lib.process_images.restype = ctypes.c_char_p
    
    def _create_callback(self, progress_callback: Optional[callable] = None):
        """创建 C 回调函数"""
        def c_callback(step, msg, progress, error_code, error_msg, data, current, total):
            if progress_callback:
                progress_callback(
                    step=step,
                    message=msg.decode() if msg else "",
                    progress=progress,
                    error_code=error_code,
                    error_msg=error_msg.decode() if error_msg else "",
                    data=data.decode() if data else "",
                    current=current,
                    total=total
                )
        
        return self.CALLBACK_TYPE(c_callback)
    
    def process_images(
        self,
        image_paths: List[str],
        output_dir: str,
        progress_callback: Optional[callable] = None
    ) -> Dict[str, Any]:
        """
        调用 C 算法处理多张图片
        
        Args:
            image_paths: 图片路径列表
            output_dir: 输出目录
            progress_callback: 进度回调函数
            
        Returns:
            处理结果字典
        """
        if not image_paths:
            return {"status": "error", "message": "图片列表为空"}
        
        # 创建输出目录
        Path(output_dir).mkdir(parents=True, exist_ok=True)
        
        # 准备参数
        # 将 Python 字符串列表转换为 C 字符串数组
        c_strings = [path.encode('utf-8') for path in image_paths]
        c_array = (ctypes.c_char_p * len(c_strings))(*c_strings)
        
        # 创建回调
        callback = self._create_callback(progress_callback)
        
        # 调用 C 函数
        result_ptr = self.lib.process_images(
            c_array,
            len(c_strings),
            output_dir.encode('utf-8'),
            callback
        )
        
        # 解析结果
        result_str = result_ptr.decode('utf-8')
        return json.loads(result_str)
    
    def process_task(
        self,
        task_id: str,
        image_paths: List[str],
        output_dir: str,
        progress_callback: Optional[callable] = None
    ) -> Dict[str, Any]:
        """
        处理任务中的所有图片
        """
        return self.process_images(image_paths, output_dir, progress_callback)