from extensions import db

class Banner(db.Model):
    __tablename__ = 'banners'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    image_url = db.Column(db.String(300), nullable=False)
    active = db.Column(db.Boolean, default=True)

    def __repr__(self):
        return f"<Banner {self.title}>"
