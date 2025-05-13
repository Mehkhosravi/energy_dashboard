from extensions import db

class CommuneGeometry(db.Model):
    __tablename__ = 'commune_geometry'

    comune_code = db.Column(db.Integer, primary_key=True)
    comune_name = db.Column(db.String)
    wkt = db.Column(db.Text)
