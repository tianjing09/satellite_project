#!/usr/bin/env python
import os
import sys
import json
from pathlib import Path

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.c_algorithm import CAlgorithm


def progress_callback(step, message, progress, error_code, error_msg, data, current, total):
    """进度回调"""
    if error_code != 0:
        print(f"❌ 错误: {error_msg}")
    else:
        print(f"📊 [{current+1}/{total}] {message} ({progress}%)")


def main():
    # 1. 准备测试图片
    test_images = []
    test_dir = Path("test_images")
    
    if test_dir.exists():
        test_images = [str(p) for p in test_dir.glob("*.jpg")]
    else:
        print("⚠️ 没有测试图片，创建测试目录...")
        test_dir.mkdir(exist_ok=True)
        # 创建一个空文件模拟（实际项目中用真实图片）
        (test_dir / "test1.jpg").touch()
        (test_dir / "test2.jpg").touch()
        test_images = [str(test_dir / "test1.jpg"), str(test_dir / "test2.jpg")]
    
    print(f"📁 找到 {len(test_images)} 张图片")
    
    # 2. 创建 C 算法实例
    try:
        c_algo = CAlgorithm()
        print("✅ C 算法加载成功")
    except FileNotFoundError as e:
        print(f"❌ {e}")
        print("请确保 lib/libsatellite.dylib 存在")
        return
    
    # 3. 调用处理
    output_dir = "test_output"
    print(f"📤 输出目录: {output_dir}")
    
    try:
        result = c_algo.process_images(
            image_paths=test_images,
            output_dir=output_dir,
            progress_callback=progress_callback
        )
        
        print("\n📋 处理结果:")
        print(json.dumps(result, indent=2, ensure_ascii=False))
        
    except Exception as e:
        print(f"❌ 处理失败: {e}")


if __name__ == "__main__":
    main()