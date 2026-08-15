from ultralytics import YOLO

if __name__ == "__main__":
    model = YOLO("yolov8n.pt") 

    results = model.train(
        data=r"d:\PROJECTS\PAWPHILE\cv\datasets\yolo\data.yaml",
        epochs=1,
        imgsz=320,  # reduced size to prevent OOM
        batch=4,    # small batch
        workers=0,  # no multiprocessing to prevent paging issues on Windows
        project=r"d:\PROJECTS\PAWPHILE\cv\models",
        name="yolo_dog_det_v2",
        exist_ok=True
    )
    
    print("YOLO 1-epoch training completed.")
